import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { discountCode, ticketType } = await request.json()

    if (!discountCode || !ticketType) {
      return NextResponse.json(
        { message: 'Discount code and ticket type are required' },
        { status: 400 }
      )
    }

    // 割引リンクを検索
    const discountLink = await prisma.discountLink.findUnique({
      where: { code: discountCode }
    })

    if (!discountLink) {
      return NextResponse.json(
        { message: 'Invalid discount code' },
        { status: 404 }
      )
    }

    // 割引リンクが有効かチェック
    const now = new Date()
    const validFrom = new Date(discountLink.validFrom)
    const validUntil = new Date(discountLink.validUntil)

    if (!discountLink.isActive) {
      return NextResponse.json(
        { message: 'This discount code is not active' },
        { status: 400 }
      )
    }

    if (now < validFrom || now > validUntil) {
      return NextResponse.json(
        { message: 'This discount code is not valid at this time' },
        { status: 400 }
      )
    }

    // 対象チケットタイプかチェック
    if (discountLink.targetTicketType !== ticketType) {
      return NextResponse.json(
        { message: 'This discount code is not valid for the selected ticket type' },
        { status: 400 }
      )
    }

    // 利用回数制限をチェック
    if (discountLink.maxUses && discountLink.currentUses >= discountLink.maxUses) {
      return NextResponse.json(
        { message: 'This discount code has reached its usage limit' },
        { status: 400 }
      )
    }

    // ユーザーをメールアドレスで検索して正しいIDを取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }


    // ユーザーが既にこの割引リンクを使用しているかチェック
    const userUsedLink = await prisma.discountLink.findFirst({
      where: {
        id: discountLink.id,
        users: {
          some: {
            id: user.id
          }
        }
      }
    })

    if (userUsedLink) {
      return NextResponse.json(
        { message: 'You have already used this discount code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      discountLink: {
        id: discountLink.id,
        name: discountLink.name,
        discountType: discountLink.discountType,
        discountValue: discountLink.discountValue,
        originalPrice: discountLink.originalPrice,
        discountedPrice: discountLink.discountedPrice
      }
    })
  } catch (error) {
    console.error('Failed to validate discount code:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
