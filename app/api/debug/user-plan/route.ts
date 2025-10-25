import { NextResponse } from 'next/server'
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

export async function GET() {
  // TODO: userPlanテーブル削除により一時的に無効化
  return NextResponse.json({
    message: 'User plan debugging disabled - migrated to ticket system',
    currentPlan: null,
    allPlans: [],
    debug: {
      hasUserPlan: false
    }
  })
  
  /* 元の実装（userPlanテーブル削除により一時的に無効化）
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== User Plan Debug Info ===')
    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)

    // メールアドレスでユーザーを検索 (Supabase SDK使用)
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', session.user.email!)
      .single()

    if (userError || !user) {
      console.error('User not found:', userError)
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Found user:', {
      id: user.id,
      email: user.email,
      name: user.name
    })

    // 注：userPlanテーブルは削除済み（チケット制度移行のため）
    const allUserPlans = [] // 空配列
    console.log('User plans disabled - migrated to ticket system')

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      currentPlan: user.userPlan,
      allPlans: allUserPlans,
      debug: {
        sessionUserId: session.user.id,
        foundUserId: user.id,
        hasUserPlan: !!user.userPlan
      }
    })
  } catch (error) {
    console.error('Debug user plan error:', error)
    return NextResponse.json(
      { 
        message: 'Debug failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
  */
}
