import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  // TODO: チケット制度移行により一時的に無効化
  return NextResponse.json({
    message: 'Subscription cancellation disabled - migrated to ticket system'
  }, { status: 400 })
  
  /* 元の実装（userPlanテーブル削除により一時的に無効化）
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 })
    }

    // Stripeサブスクリプションをキャンセル
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })

    // データベースのプラン情報を更新
    await prisma.userPlan.update({
      where: { userId: session.user.id },
      data: {
        status: 'CANCELLED',
        endDate: new Date(subscription.current_period_end * 1000)
      }
    })

    return NextResponse.json({
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
  */
}
