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

    // NOTE: ユーザー検索（Supabase SDK実装 - コメントアウト済み）
    /*
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', session.user.email!)
      .single()

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }
    */
    console.log('User search disabled (commented out)')

    console.log('=== Plan Upgrade Debug ===')
    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)
    // NOTE: プラン管理処理（Supabase SDK実装 - コメントアウト済み）
    /*
    console.log('Found user ID:', user.id)
    console.log('Found user email:', user.email)
    console.log(`Processing payment: ${planType} - ¥${amount} - ${paymentMethod}`)
    
    // チケット制度移行により無効化済み
    */
    console.log('Plan upgrade processing disabled (commented out)')
      
    // NOTE: 残りの処理も無効化済み（チケット制度移行）
    console.log('All plan update operations disabled (commented out)')

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
