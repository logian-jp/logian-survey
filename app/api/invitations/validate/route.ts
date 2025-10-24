import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { message: '招待コードが必要です' },
        { status: 400 }
      )
    }

    // 招待コードを検証
    const invitation = await prisma.invitation.findUnique({
      where: { code },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { message: '無効な招待コードです' },
        { status: 404 }
      )
    }

    if (invitation.isUsed) {
      return NextResponse.json(
        { message: 'この招待コードは既に使用されています' },
        { status: 400 }
      )
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { message: 'この招待コードは期限切れです' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        inviterName: invitation.inviterName || invitation.inviter.name,
        inviterEmail: invitation.inviterEmail,
        message: invitation.message,
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName
      }
    })
  } catch (error) {
    console.error('Failed to validate invitation:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
