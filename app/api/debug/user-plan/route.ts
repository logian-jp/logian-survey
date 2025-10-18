import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== User Plan Debug Info ===')
    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: {
        userPlan: true
      }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Found user:', {
      id: user.id,
      email: user.email,
      name: user.name,
      userPlan: user.userPlan
    })

    // 全ユーザープランを確認
    const allUserPlans = await prisma.userPlan.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    console.log('All user plans for this user:', allUserPlans)

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
}
