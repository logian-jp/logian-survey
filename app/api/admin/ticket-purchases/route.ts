import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = searchParams.get('userId')
    const ticketType = searchParams.get('ticketType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')
    const search = searchParams.get('search')

    // フィルター条件を構築
    const where: any = {}

    if (userId) {
      where.userId = userId
    }

    if (ticketType) {
      where.ticketType = ticketType
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    if (minAmount || maxAmount) {
      where.amount = {}
      if (minAmount) {
        where.amount.gte = parseInt(minAmount)
      }
      if (maxAmount) {
        where.amount.lte = parseInt(maxAmount)
      }
    }

    // 検索条件（ユーザー名、メール、Stripe決済ID）
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { checkoutSessionId: { contains: search, mode: 'insensitive' } }
      ]
    }

    // チケット購入履歴を取得
    const [purchases, totalCount] = await Promise.all([
      prisma.ticketPurchase.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true
            }
          },
          survey: {
            select: {
              id: true,
              title: true,
              shareUrl: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.ticketPurchase.count({ where })
    ])

    // 統計情報を取得
    const stats = await prisma.ticketPurchase.aggregate({
      where,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    // チケットタイプ別の統計
    const ticketTypeStats = await prisma.ticketPurchase.groupBy({
      by: ['ticketType'],
      where,
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    // ユーザー一覧（フィルター用）
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      purchases,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: {
        totalPurchases: stats._count.id,
        totalAmount: stats._sum.amount || 0,
        averageAmount: stats._count.id > 0 ? (stats._sum.amount || 0) / stats._count.id : 0
      },
      ticketTypeStats,
      users
    })
  } catch (error) {
    console.error('Failed to fetch admin ticket purchases:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
