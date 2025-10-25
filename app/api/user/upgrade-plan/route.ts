import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // TODO: チケット制度移行により一時的に無効化
  return NextResponse.json({
    message: 'Plan upgrade disabled - migrated to ticket system'
  }, { status: 400 })
  
  /* 元の実装（userPlanテーブル削除により一時的に無効化）
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { planType, paymentMethod, amount } = await request.json()

    if (!planType) {
      return NextResponse.json(
        { message: 'Plan type is required' },
        { status: 400 }
      )
    }

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('=== Plan Upgrade Debug ===')
    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)
    console.log('Found user ID:', user.id)
    console.log('Found user email:', user.email)
    console.log(`Processing payment: ${planType} - ¥${amount} - ${paymentMethod}`)
    console.log('Request body:', { planType, paymentMethod, amount })
    
    // 現在のプランを確認
    const currentPlan = await prisma.userPlan.findUnique({
      where: { userId: user.id }
    })
    console.log('Current plan before update:', currentPlan)
    
    // 実際のStripe連携は後で実装
    // ここでは単純にプランを更新
    let userPlan;
    try {
      userPlan = await prisma.userPlan.upsert({
        where: { userId: user.id },
        update: {
          planType: planType,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null // サブスクリプションの場合は適切な終了日を設定
        },
        create: {
          userId: user.id,
          planType: planType,
          status: 'ACTIVE',
          startDate: new Date()
        }
      })
      
      console.log('User plan updated successfully:', userPlan)
      
      // 更新後の確認
      const updatedPlan = await prisma.userPlan.findUnique({
        where: { userId: user.id }
      })
      console.log('Plan after update verification:', updatedPlan)
      console.log('Updated plan type:', updatedPlan?.planType)
      console.log('Updated plan status:', updatedPlan?.status)
      
    } catch (error) {
      console.error('Failed to update user plan:', error)
      return NextResponse.json(
        { message: 'Failed to update user plan' },
        { status: 500 }
      )
    }

    // セッション更新のためのユーザー情報を取得
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userPlan: true
      }
    })

    return NextResponse.json({
      message: 'Plan upgraded successfully',
      userPlan,
      user: updatedUser
    })
  } catch (error) {
    console.error('Failed to upgrade plan:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
  */
}
