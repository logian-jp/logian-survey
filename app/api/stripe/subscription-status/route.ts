import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーのプラン情報を取得
    const userPlan = await prisma.userPlan.findUnique({
      where: { userId: session.user.id }
    })

    if (!userPlan) {
      return NextResponse.json({ error: 'User plan not found' }, { status: 404 })
    }

    // 有料プランの場合、Stripeのサブスクリプション情報も取得
    if (userPlan.planType !== 'FREE') {
      try {
        // Stripe Customerを検索
        const customers = await stripe.customers.list({
          email: session.user.email!,
          limit: 1
        })

        if (customers.data.length > 0) {
          const customer = customers.data[0]
          
          // アクティブなサブスクリプションを取得
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
          })

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0]
            
            return NextResponse.json({
              userPlan,
              subscription: {
                id: subscription.id,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                priceId: subscription.items.data[0]?.price.id,
              }
            })
          }
        }
      } catch (stripeError) {
        console.error('Stripe error:', stripeError)
        // Stripeエラーが発生しても、データベースの情報は返す
      }
    }

    return NextResponse.json({ userPlan })
  } catch (error) {
    console.error('Error fetching subscription status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}
