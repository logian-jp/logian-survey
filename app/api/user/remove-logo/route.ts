import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { getUserPlan } from '@/lib/plan-limits'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // プランチェック
    const userPlan = await getUserPlan(session.user.id)
    if (userPlan?.planType !== 'ENTERPRISE') {
      return NextResponse.json({ message: 'Enterprise plan required' }, { status: 403 })
    }

    // Base64データの場合はファイルシステムから削除する必要がない
    // データベースから直接削除するだけ

    // データベースを更新
    await prisma.user.update({
      where: { id: session.user.id },
      data: { customLogoUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logo removal error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
