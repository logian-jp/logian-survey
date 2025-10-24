import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { invitedEmail, invitedName, message } = await request.json()

    // ユーザーの招待可能数をチェック
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { maxInvitations: true, usedInvitations: true }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.usedInvitations >= user.maxInvitations) {
      return NextResponse.json(
        { message: '招待可能な人数に達しています' },
        { status: 400 }
      )
    }

    // 招待コードを生成
    const invitationCode = randomBytes(16).toString('hex')

    // 招待レコードを作成（トランザクション使用）
    const result = await prisma.$transaction(async (tx) => {
      // 招待レコードを作成
      const invitation = await tx.invitation.create({
        data: {
          code: invitationCode,
          inviterId: session.user.id,
          inviterEmail: session.user.email || '',
          inviterName: session.user.name || null,
          invitedEmail: invitedEmail || null,
          invitedName: invitedName || null,
          message: message || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後
        }
      })

      // ユーザーの使用済み招待数をインクリメント
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          usedInvitations: {
            increment: 1
          }
        }
      })

      return invitation
    })

    // 招待リンクを生成
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/invite/${invitationCode}`

    return NextResponse.json({
      invitation: {
        id: result.id,
        code: result.code,
        url: invitationUrl,
        expiresAt: result.expiresAt
      }
    })
  } catch (error) {
    console.error('Failed to create invitation:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
