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

    // 以下はPrismaコードをコメントアウト
    /*
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        maxInvitations: true,
        usedInvitations: true
      }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const stats = {
      maxInvitations: user.maxInvitations,
      usedInvitations: user.usedInvitations,
      remainingInvitations: user.maxInvitations - user.usedInvitations
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
