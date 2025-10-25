import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // TODO: チケット制度移行により一時的に無効化
  console.log('Stripe webhook received but disabled - migrated to ticket system')
  return NextResponse.json({ 
    received: true,
    message: 'Webhook disabled - migrated to ticket system'
  })
}

/* 元の実装（userPlanテーブル削除により一時的に無効化）
export async function POST_DISABLED(request: NextRequest) {
  console.log('Webhook received:', new Date().toISOString())
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  // 開発環境では署名検証をスキップ
  if (process.env.NODE_ENV === 'development' && !process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('Development mode: skipping webhook signature verification')
    try {
      const event = JSON.parse(body) as Stripe.Event
      console.log('Processing webhook event (dev mode):', event.type)
      await processWebhookEvent(event)
      return NextResponse.json({ received: true })
    } catch (err) {
      console.error('Failed to process webhook in dev mode:', err)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
  }

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('Missing signature or webhook secret')
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  await processWebhookEvent(event)
  return NextResponse.json({ received: true })
}

async function processWebhookEvent(event: Stripe.Event) {

  try {
    console.log('Processing webhook event:', event.type)
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('Checkout session completed:', session.id, 'metadata:', session.metadata)
        await handleCheckoutCompleted(session)
        break
      }
      
      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentCanceled(paymentIntent)
        break
      }
      
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        await handleChargeDispute(dispute)
        break
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancelled(subscription)
        break
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    throw error
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const ticketType = session.metadata?.ticketType
  const quantity = parseInt(session.metadata?.quantity || '1')
  const type = session.metadata?.type
  const planType = session.metadata?.planType
  const addonId = session.metadata?.addonId
  const surveyId = session.metadata?.surveyId
  
  if (!userId) {
    console.error('Missing userId in session metadata')
    return
  }

  try {
    // チケット購入の場合
    if (type === 'ticket_purchase' && ticketType) {
      await handleTicketPurchase(userId, ticketType, quantity, session)
      return
    }

    // データアドオンの場合
    if (planType === 'DATA_ADDON' && addonId) {
      await handleDataAddonPurchase(userId, addonId, session, surveyId)
      return
    }

    // ユーザーのプランを更新
    await prisma.userPlan.upsert({
      where: { userId },
      update: {
        planType: planType as any,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: null
      },
      create: {
        userId,
        planType: planType as any,
        status: 'ACTIVE',
        startDate: new Date()
      }
    })

    console.log(`Plan updated for user ${userId} to ${planType}`)

    // 購入記録の保存（Checkout Sessionベース）
    try {
      await (prisma as any).surveyPurchase.create({
        data: {
          userId,
          surveyId: surveyId || null,
          planType: (planType as any),
          amount: (session.amount_total as number) || null,
          currency: (session.currency as string) || 'jpy',
          checkoutSessionId: session.id,
          paymentIntentId: (session.payment_intent as string) || null,
          metadata: session.metadata ? (session.metadata as any) : undefined,
        }
      })
    } catch (e) {
      console.error('Failed to create SurveyPurchase record:', e)
    }

    // プラン枠の付与（surveyIdがnullの場合のみ）
    if (!surveyId) {
      try {
        const slotCount = getSlotCountForPlan(planType)
        if (slotCount > 0) {
          await (prisma as any).userPlanSlot.create({
            data: {
              userId,
              planType: (planType as any),
              totalSlots: slotCount,
              usedSlots: 0,
              remainingSlots: slotCount,
              expiresAt: null // 永続
            }
          })
          console.log(`Added ${slotCount} slots for plan ${planType} to user ${userId}`)
        }
      } catch (e) {
        console.error('Failed to create UserPlanSlot record:', e)
      }
    }

    // アンケート単位の適用（単発決済を想定）
    if (surveyId) {
      try {
        // プランの制約に基づいてアンケートを更新
        const { getPlanLimits } = await import('@/lib/plan-limits')
        const limits = getPlanLimits(planType || 'FREE')

        // 回答上限
        const maxResponses = limits.maxResponsesPerSurvey === -1 ? null : limits.maxResponsesPerSurvey
        // 募集期間（now + days）
        const endDate = limits.surveyDurationDays
          ? new Date(Date.now() + limits.surveyDurationDays * 24 * 60 * 60 * 1000)
          : null

        await prisma.survey.update({
          where: { id: surveyId },
          data: {
            maxResponses: maxResponses,
            endDate: endDate,
          }
        })
        console.log(`Applied plan ${planType} to survey ${surveyId}`)
      } catch (e) {
        console.error('Failed to apply plan to survey:', e)
      }
    }
  } catch (error) {
    console.error('Error updating user plan:', error)
  }
}

async function handleDataAddonPurchase(userId: string, addonId: string, session: Stripe.Checkout.Session, surveyId?: string) {
  try {
    const addon = await (prisma as any).dataStorageAddon.findUnique({
      where: { id: addonId }
    })

    if (!addon) {
      console.error('Addon not found:', addonId)
      return
    }

    // ユーザーのアドオン購入履歴を作成
    const userAddon = await (prisma as any).userDataAddon.create({
      data: {
        userId,
        addonId,
        status: 'ACTIVE',
        stripePaymentIntentId: session.payment_intent as string,
        expiresAt: addon.isMonthly ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null, // 月額の場合は30日後に期限切れ
        surveyId: surveyId || null
      }
    })

    // アドオン購入通知を作成
    await (prisma as any).notification.create({
      data: {
        userId,
        type: 'ADDON_PURCHASED',
        title: 'データアドオンを購入しました',
        message: `${addon.name}を購入しました。${addon.type === 'storage' ? 'データ容量' : '保存期間'}が${addon.type === 'storage' ? `${addon.amount}MB` : `${addon.amount}日`}追加されました。`,
        data: JSON.stringify({
          addonId: addon.id,
          addonName: addon.name,
          addonType: addon.type,
          addonAmount: addon.amount,
          surveyId: surveyId || null
        })
      }
    })

    console.log(`Data addon purchased: ${addon.name} for user ${userId}`)
  } catch (error) {
    console.error('Error handling data addon purchase:', error)
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id
  
  if (!customerId || !priceId) {
    console.error('Missing customerId or priceId in subscription')
    return
  }

  try {
    // CustomerからユーザーIDを取得
    const customer = await getStripe().customers.retrieve(customerId)
    if (customer.deleted) {
      console.error('Customer is deleted')
      return
    }
    const userId = customer.metadata?.userId
    
    if (!userId) {
      console.error('No userId found in customer metadata')
      return
    }

    // データアドオンの月額サブスクリプションの場合
    const addonId = subscription.metadata?.addonId
    const surveyId = subscription.metadata?.surveyId
    if (addonId) {
      await handleDataAddonSubscription(subscription, userId, addonId, surveyId)
      return
    }

    // Price IDからプランタイプを取得
    const planType = getPlanTypeFromPriceId(priceId)
    if (!planType) {
      console.error('Unknown price ID:', priceId)
      return
    }

    // サブスクリプション情報を更新
    await prisma.userPlan.upsert({
      where: { userId },
      update: {
        planType: planType as any,
        status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
        startDate: new Date((subscription as any).current_period_start * 1000),
        endDate: new Date((subscription as any).current_period_end * 1000)
      },
      create: {
        userId,
        planType: planType as any,
        status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELLED',
        startDate: new Date((subscription as any).current_period_start * 1000),
        endDate: new Date((subscription as any).current_period_end * 1000)
      }
    })

    console.log(`Subscription updated for user ${userId}`)
  } catch (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleDataAddonSubscription(subscription: Stripe.Subscription, userId: string, addonId: string, surveyId?: string) {
  try {
    const addon = await (prisma as any).dataStorageAddon.findUnique({
      where: { id: addonId }
    })

    if (!addon) {
      console.error('Addon not found:', addonId)
      return
    }

    // 既存のユーザーアドオンを更新または作成
    await (prisma as any).userDataAddon.upsert({
      where: {
        userId_addonId_status: {
          userId,
          addonId,
          status: 'ACTIVE'
        }
      },
      update: {
        stripeSubscriptionId: subscription.id,
        expiresAt: new Date((subscription as any).current_period_end * 1000),
        surveyId: surveyId || null
      },
      create: {
        userId,
        addonId,
        status: 'ACTIVE',
        stripeSubscriptionId: subscription.id,
        expiresAt: new Date((subscription as any).current_period_end * 1000),
        surveyId: surveyId || null
      }
    })

    // アドオン購入通知を作成
    await (prisma as any).notification.create({
      data: {
        userId,
        type: 'ADDON_PURCHASED',
        title: 'データアドオンの月額プランを開始しました',
        message: `${addon.name}の月額プランを開始しました。${addon.type === 'storage' ? 'データ容量' : '保存期間'}が${addon.type === 'storage' ? `${addon.amount}MB` : `${addon.amount}日`}追加されました。`,
        data: JSON.stringify({
          addonId: addon.id,
          addonName: addon.name,
          addonType: addon.type,
          addonAmount: addon.amount,
          surveyId: surveyId || null
        })
      }
    })

    console.log(`Data addon subscription updated: ${addon.name} for user ${userId}`)
  } catch (error) {
    console.error('Error handling data addon subscription:', error)
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  
  try {
    const customer = await getStripe().customers.retrieve(customerId)
    if (customer.deleted) {
      console.error('Customer is deleted')
      return
    }
    const userId = customer.metadata?.userId
    
    if (!userId) {
      console.error('No userId found in customer metadata')
      return
    }

    // プランをFREEに戻す
    await prisma.userPlan.update({
      where: { userId },
      data: {
        planType: 'FREE',
        status: 'CANCELLED',
        endDate: new Date()
      }
    })

    console.log(`Subscription cancelled for user ${userId}`)
  } catch (error) {
    console.error('Error cancelling subscription:', error)
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded for invoice:', invoice.id)
  // 必要に応じて追加の処理を実装
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id)
  // 必要に応じて追加の処理を実装
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log('Payment canceled:', paymentIntent.id)
    
    // SurveyPurchaseのstatusをCANCELLEDに更新
    await (prisma as any).surveyPurchase.updateMany({
      where: {
        paymentIntentId: paymentIntent.id
      },
      data: {
        status: 'CANCELLED'
      }
    })
    
    console.log('SurveyPurchase status updated to CANCELLED for payment intent:', paymentIntent.id)
  } catch (error) {
    console.error('Error handling payment cancellation:', error)
  }
}

async function handleChargeDispute(dispute: Stripe.Dispute) {
  try {
    console.log('Charge dispute created:', dispute.id)
    
    // 関連するSurveyPurchaseのstatusをREFUNDEDに更新
    await (prisma as any).surveyPurchase.updateMany({
      where: {
        paymentIntentId: dispute.payment_intent
      },
      data: {
        status: 'REFUNDED'
      }
    })
    
    console.log('SurveyPurchase status updated to REFUNDED for dispute:', dispute.id)
  } catch (error) {
    console.error('Error handling charge dispute:', error)
  }
}

function getPlanTypeFromPriceId(priceId: string): string | null {
  const priceIdMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_ID_STANDARD || '']: 'STANDARD',
    [process.env.STRIPE_PRICE_ID_PROFESSIONAL || '']: 'PROFESSIONAL',
    [process.env.STRIPE_PRICE_ID_ENTERPRISE || '']: 'ENTERPRISE',
    [process.env.STRIPE_PRICE_ID_ONETIME || '']: 'ONETIME_UNLIMITED',
  }
  
  return priceIdMap[priceId] || null
}

function getSlotCountForPlan(planType: string): number {
  const slotMap: Record<string, number> = {
    'FREE': 3,           // 無料プラン: 3枠
    'STANDARD': 1,        // スタンダード: 1枠
    'PROFESSIONAL': 1,    // プロフェッショナル: 1枠
    'ENTERPRISE': 1,      // エンタープライズ: 1枠
    'ONETIME_UNLIMITED': 1 // 無制限: 1枠
  }
  
  return slotMap[planType] || 0
}

async function handleTicketPurchase(userId: string, ticketType: string, quantity: number, session: Stripe.Checkout.Session) {
  try {
    console.log(`Processing ticket purchase: userId=${userId}, ticketType=${ticketType}, quantity=${quantity}`)
    
    // 既存のチケットを検索
    const existingTicket = await prisma.userTicket.findFirst({
      where: {
        userId,
        ticketType: ticketType as any
      }
    })
    
    console.log(`Existing ticket found:`, existingTicket)

    if (existingTicket) {
      // 既存のチケットを更新
      const updatedTicket = await prisma.userTicket.update({
        where: { id: existingTicket.id },
        data: {
          totalTickets: existingTicket.totalTickets + quantity,
          remainingTickets: existingTicket.remainingTickets + quantity
        }
      })
      console.log(`Updated existing ticket:`, updatedTicket)
    } else {
      // 新しいチケットを作成
      const newTicket = await prisma.userTicket.create({
        data: {
          userId,
          ticketType: ticketType as any,
          totalTickets: quantity,
          usedTickets: 0,
          remainingTickets: quantity,
          expiresAt: null // 永続
        }
      })
      console.log(`Created new ticket:`, newTicket)
    }

    // 購入記録を作成
    try {
      await prisma.ticketPurchase.create({
        data: {
          userId,
          surveyId: null,
          ticketType: ticketType as any,
          amount: session.amount_total,
          currency: session.currency,
          checkoutSessionId: session.id,
          paymentIntentId: session.payment_intent as string,
          metadata: {
            quantity: quantity.toString()
          }
        }
      })
      console.log(`TicketPurchase record created for user ${userId}`)
    } catch (e) {
      console.error('Failed to create TicketPurchase record:', e)
    }

    console.log(`Added ${quantity} ${ticketType} tickets for user ${userId}`)
  } catch (error) {
    console.error('Failed to handle ticket purchase:', error)
  }
}
*/
