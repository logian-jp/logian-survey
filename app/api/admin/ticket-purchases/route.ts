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

    // フィルター条件はSupabaseクエリで直接適用（下記で実装）

    // チケット購入履歴を取得 (Supabase SDK完全実装)
    let purchasesQuery = supabase
      .from('TicketPurchase')
      .select(`
        *,
        user:User!userId(id, name, email, createdAt),
        survey:Survey!surveyId(id, title, shareUrl, createdAt)
      `)
      .order('createdAt', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // フィルター条件を適用
    if (userId) purchasesQuery = purchasesQuery.eq('userId', userId)
    if (ticketType) purchasesQuery = purchasesQuery.eq('ticketType', ticketType)
    if (startDate) purchasesQuery = purchasesQuery.gte('createdAt', new Date(startDate).toISOString())
    if (endDate) purchasesQuery = purchasesQuery.lte('createdAt', new Date(endDate).toISOString())
    if (minAmount) purchasesQuery = purchasesQuery.gte('amount', parseInt(minAmount))
    if (maxAmount) purchasesQuery = purchasesQuery.lte('amount', parseInt(maxAmount))
    if (search) {
      purchasesQuery = purchasesQuery.or(`user.name.ilike.%${search}%,user.email.ilike.%${search}%,checkoutSessionId.ilike.%${search}%`)
    }

    // 購入履歴とカウントを並行取得
    const [purchasesResult, totalCountResult] = await Promise.all([
      purchasesQuery,
      supabase.from('TicketPurchase').select('*', { count: 'exact', head: true })
    ])

    const { data: purchases, error: purchasesError } = purchasesResult
    const { count: totalCount, error: countError } = totalCountResult

    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError)
      return NextResponse.json({ message: 'Failed to fetch purchases' }, { status: 500 })
    }

    if (countError) {
      console.error('Error fetching total count:', countError)
      return NextResponse.json({ message: 'Failed to fetch count' }, { status: 500 })
    }

    // ✅ Supabase SDK完全移行完了

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
