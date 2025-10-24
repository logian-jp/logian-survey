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

    // ユーザーの招待一覧を取得
    const invitations = await prisma.invitation.findMany({
      where: {
        inviterId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        usedByUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ 
      invitations: invitations.map(invitation => ({
        id: invitation.id,
        code: invitation.code,
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName,
        message: invitation.message,
        isUsed: invitation.isUsed,
        usedAt: invitation.usedAt,
        usedByUser: invitation.usedByUser,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      }))
    })
  } catch (error) {
    console.error('Failed to fetch invitations:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
