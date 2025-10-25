import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの招待統計を取得
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('maxInvitations, usedInvitations')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ message: 'Failed to fetch user data' }, { status: 500 })
    }

    const user = users

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // 招待統計を計算
    const stats = {
      maxInvitations: user.maxInvitations || 0,
      usedInvitations: user.usedInvitations || 0,
      remainingInvitations: (user.maxInvitations || 0) - (user.usedInvitations || 0)
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Failed to fetch invitation stats:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
