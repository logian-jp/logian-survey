import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const {
      planType,
      name,
      description,
      price,
      features,
      limits,
      isActive,
      sortOrder
    } = await request.json()

    // バリデーション
    if (!planType || !name || price === undefined) {
      return NextResponse.json(
        { message: 'Required fields are missing' },
        { status: 400 }
      )
    }

    // プランタイプの重複チェック（自分以外）
    const existingPlan = await prisma.planConfig.findFirst({
      where: {
        planType,
        id: { not: params.id }
      }
    })

    if (existingPlan) {
      return NextResponse.json(
        { message: 'Plan type already exists' },
        { status: 400 }
      )
    }

    const planConfig = await prisma.planConfig.update({
      where: { id: params.id },
      data: {
        planType,
        name,
        description,
        price,
        features,
        limits,
        isActive,
        sortOrder
      }
    })

    return NextResponse.json(planConfig)
  } catch (error) {
    console.error('Failed to update plan config:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    await prisma.planConfig.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Plan config deleted successfully' })
  } catch (error) {
    console.error('Failed to delete plan config:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
