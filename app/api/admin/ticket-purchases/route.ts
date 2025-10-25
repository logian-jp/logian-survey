import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
      supabase.from('TicketPurchase').select('*', { count: 'exact', head: true })
    ])

    // Supabaseでは上記のPrismaスタイルが使えないため、別途修正が必要
    // TODO: 後でSupabase SDKに完全移行

    // 統計情報を取得 (Supabase SDK使用)
    let statsQuery = supabase
      .from('TicketPurchase')
      .select('amount')

    if (search) {
      statsQuery = statsQuery.or(`checkoutSessionId.ilike.%${search}%`)
    }

    const { data: purchaseAmounts, error: statsError } = await statsQuery

    if (statsError) {
      console.error('Error fetching purchase stats:', statsError)
      return NextResponse.json({ message: 'Failed to fetch stats' }, { status: 500 })
    }

    // 手動で集計
    const totalAmount = purchaseAmounts?.reduce((sum, purchase) => sum + (purchase.amount || 0), 0) || 0
    const purchaseCount = purchaseAmounts?.length || 0

    const stats = {
      _sum: { amount: totalAmount },
      _count: { id: purchaseCount }
    }

    // チケットタイプ別の統計 (Supabase SDK使用)
    let typeStatsQuery = supabase
      .from('TicketPurchase')
      .select('ticketType, amount')

    if (search) {
      typeStatsQuery = typeStatsQuery.or(`checkoutSessionId.ilike.%${search}%`)
    }

    const { data: typeStatsData, error: typeStatsError } = await typeStatsQuery

    if (typeStatsError) {
      console.error('Error fetching type stats:', typeStatsError)
      return NextResponse.json({ message: 'Failed to fetch type stats' }, { status: 500 })
    }

    // 手動でグループ化・集計
    const ticketTypeStats = typeStatsData?.reduce((acc, purchase) => {
      const type = purchase.ticketType
      if (!acc[type]) {
        acc[type] = { ticketType: type, _sum: { amount: 0 }, _count: { id: 0 } }
      }
      acc[type]._sum.amount += purchase.amount || 0
      acc[type]._count.id += 1
      return acc
    }, {} as any) || {}

    const ticketTypeStatsArray = Object.values(ticketTypeStats)

    // ユーザー一覧（フィルター用） (Supabase SDK使用)
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('id, name, email')
      .order('name', { ascending: true })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 })
    }

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
