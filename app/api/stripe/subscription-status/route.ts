import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'

export async function GET() {
  // TODO: チケット制度移行により一時的に無効化
  return NextResponse.json({
    message: 'Subscription status disabled - migrated to ticket system',
    hasActiveSubscription: false,
    planType: 'TICKET_SYSTEM'
  })
  
  /* 元の実装（userPlanテーブル削除により一時的に無効化）
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // NOTE: ユーザープラン情報取得（Supabase SDK実装 - コメントアウト済み）
    /*
    const { data: userPlan, error } = await supabase
      .from('UserPlan')
      .select('*')
      .eq('userId', session.user.id)
      .single()

    if (error || !userPlan) {
      return NextResponse.json({ error: 'User plan not found' }, { status: 404 })
    }
    */
    console.log('User plan lookup disabled (commented out)')

    // 有料プランの場合、Stripeのサブスクリプション情報も取得
    if (userPlan.planType !== 'FREE') {
      try {
        // Stripe Customerを検索
        const customers = await getStripe().customers.list({
          email: session.user.email!,
          limit: 1
        })

        if (customers.data.length > 0) {
          const customer = customers.data[0]
          
          // アクティブなサブスクリプションを取得
          const subscriptions = await getStripe().subscriptions.list({
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
  */
}
