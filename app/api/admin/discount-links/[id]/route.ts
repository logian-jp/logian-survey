import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック（メールアドレスで判定）
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    if (!adminEmails.includes(session.user.email || '')) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const discountLink = await prisma.discountLink.findUnique({
      where: { id },
      include: {
        users: true, // TODO: userPlan参照を削除（チケット制度移行のため）
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!discountLink) {
      return NextResponse.json({ message: 'Discount link not found' }, { status: 404 })
    }

    return NextResponse.json(discountLink)
  } catch (error) {
    console.error('Failed to fetch discount link:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック（メールアドレスで判定）
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    if (!adminEmails.includes(session.user.email || '')) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { isActive } = await request.json()

    const discountLink = await prisma.discountLink.update({
      where: { id },
      data: { isActive }
    })

    return NextResponse.json(discountLink)
  } catch (error) {
    console.error('Failed to update discount link:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
