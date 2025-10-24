import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { code, name, email, password } = await request.json()

    if (!code || !name || !email || !password) {
      return NextResponse.json(
        { message: 'すべてのフィールドが必要です' },
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

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await hash(password, 12)

    // トランザクションでユーザー作成と招待使用を処理
    const result = await prisma.$transaction(async (tx) => {
      // 新しいユーザーを作成
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          invitedBy: invitation.inviterId,
          invitationCode: code,
          maxInvitations: 3, // 新規ユーザーは3人まで招待可能
          usedInvitations: 0
        }
      })

      // 招待を使用済みにマーク
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
          usedByUserId: newUser.id
        }
      })

      // 招待者の使用済み招待数は招待作成時に既に増加済みなので、ここでは何もしない

      // 招待者にスタンダードチケットを1枚付与
      const existingTicket = await tx.userTicket.findFirst({
        where: {
          userId: invitation.inviterId,
          ticketType: 'STANDARD'
        }
      })

      if (existingTicket) {
        // 既存のスタンダードチケットがある場合は追加
        await tx.userTicket.update({
          where: { id: existingTicket.id },
          data: {
            totalTickets: { increment: 1 },
            remainingTickets: { increment: 1 }
          }
        })
      } else {
        // 新しいスタンダードチケットを作成
        await tx.userTicket.create({
          data: {
            userId: invitation.inviterId,
            ticketType: 'STANDARD',
            totalTickets: 1,
            usedTickets: 0,
            remainingTickets: 1
          }
        })
      }

      return newUser
    })

    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        name: result.name,
        email: result.email
      },
      message: 'アカウントが作成されました。招待者にスタンダードチケットが1枚付与されました。'
    })
  } catch (error) {
    console.error('Failed to use invitation:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
