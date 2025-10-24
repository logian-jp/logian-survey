import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの招待統計を取得
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
