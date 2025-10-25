import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planType, successUrl, cancelUrl, addonId, surveyId } = await request.json()

    if (!planType) {
      return NextResponse.json({ error: 'Plan type is required' }, { status: 400 })
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Stripe Customerを取得または作成
    const customer = await getOrCreateStripeCustomer(session.user.id, user.email)

    // データアドオンの場合
    if (planType === 'DATA_ADDON') {
      if (!addonId) {
        return NextResponse.json({ error: 'Addon ID is required for data addon purchase' }, { status: 400 })
      }

      const addon = await (prisma as any).dataStorageAddon.findUnique({
        where: { id: addonId }
      })

      if (!addon) {
        return NextResponse.json({ error: 'Addon not found' }, { status: 404 })
      }

      if (!addon.isActive) {
        return NextResponse.json({ error: 'Addon is not active' }, { status: 400 })
      }

      // 月額の場合
      if (addon.isMonthly) {
        if (!addon.stripePriceId) {
          return NextResponse.json({ error: 'Stripe price ID not configured for this addon' }, { status: 400 })
        }

        const checkoutSession = await getStripe().checkout.sessions.create({
          customer: customer.id,
          payment_method_types: ['card'],
          line_items: [
            {
              price: addon.stripePriceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: successUrl || `${process.env.NEXTAUTH_URL}/settings?success=true`,
          cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/settings?canceled=true`,
          metadata: {
            userId: session.user.id,
            planType: 'DATA_ADDON',
            addonId: addon.id,
            ...(surveyId ? { surveyId } : {}),
          },
          subscription_data: {
            metadata: {
              userId: session.user.id,
              planType: 'DATA_ADDON',
              addonId: addon.id,
              ...(surveyId ? { surveyId } : {}),
            },
          },
        })

        return NextResponse.json({ url: checkoutSession.url })
      } else {
        // 買い切りの場合
        const checkoutSession = await getStripe().checkout.sessions.create({
          customer: customer.id,
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'jpy',
                product_data: {
                  name: addon.name,
                  description: addon.description || undefined,
                },
                unit_amount: addon.price,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: successUrl || `${process.env.NEXTAUTH_URL}/settings?success=true`,
          cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/settings?canceled=true`,
          metadata: {
            userId: session.user.id,
            planType: 'DATA_ADDON',
            addonId: addon.id,
            ...(surveyId ? { surveyId } : {}),
          },
        })

        return NextResponse.json({ url: checkoutSession.url })
      }
    }

    // プラン設定を取得
    const planConfig = await prisma.planConfig.findUnique({
      where: { planType }
    })

    if (!planConfig) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // 単発プランの場合
    if (planType === 'ONETIME_UNLIMITED') {
      if (!planConfig.stripePriceId) {
        return NextResponse.json({ error: 'Stripe price ID not configured for this plan' }, { status: 400 })
      }
      
      const checkoutSession = await getStripe().checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: planConfig.stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl || `${process.env.NEXTAUTH_URL}/plans?success=true`,
        cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/plans?canceled=true`,
        metadata: {
          userId: session.user.id,
          planType: planType,
          ...(surveyId ? { surveyId } : {}),
        },
      })

      return NextResponse.json({ url: checkoutSession.url })
    }

    // サブスクリプションプランの場合
    if (!planConfig.stripePriceId) {
      return NextResponse.json({ error: 'Stripe price ID not configured for this plan' }, { status: 400 })
    }

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/plans?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/plans?canceled=true`,
      metadata: {
        userId: session.user.id,
        planType: planType,
        ...(surveyId ? { surveyId } : {}),
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          planType: planType,
          ...(surveyId ? { surveyId } : {}),
        },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
