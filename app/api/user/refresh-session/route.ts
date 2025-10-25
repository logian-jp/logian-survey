import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('=== Session Refresh API ===')
    
    const session = await getServerSession(authOptions)
    console.log('Current session:', session)

    if (!session?.user?.id) {
      console.log('No session, returning 401')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      // TODO: userPlan参照を削除（チケット制度移行のため）
    })

    if (!user) {
      console.log('User not found in database')
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Found user:', user.name, user.email)
    console.log('User plan: disabled (ticket system)')

    // 更新されたユーザー情報を返す
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        userPlan: null // TODO: チケット制度移行により無効化
      }
    })
  } catch (error) {
    console.error('=== Session Refresh Error ===')
    console.error('Error details:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json(
      { message: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}
