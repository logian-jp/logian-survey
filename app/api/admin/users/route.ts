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
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const dateRange = searchParams.get('dateRange') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 検索条件を構築
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    // ロールフィルター
    if (role) {
      where.role = role
    }

    // 日付範囲フィルター
    if (dateRange) {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }

      where.createdAt = {
        gte: startDate
      }
    }

    // 計算されたフィールドかどうかを判定
    const computedFields = ['publishRate', 'totalSurveys', 'activeSurveys', 'totalResponses']
    const isComputedField = computedFields.includes(sortBy)

    // ソート条件を構築（計算されたフィールド以外）
    const orderBy: any = {}
    if (!isComputedField) {
      orderBy[sortBy] = sortOrder
    }

    // ユーザー一覧を取得 (Supabase SDK使用)
    let usersQuery = supabase
      .from('User')
      .select(`
        *,
        surveys:Survey(id, status)
      `)

    // 検索条件を適用
    if (search) {
      usersQuery = usersQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (role) {
      usersQuery = usersQuery.eq('role', role)
    }
    if (dateRange) {
      const [start, end] = dateRange.split(',')
      if (start) usersQuery = usersQuery.gte('createdAt', start)
      if (end) usersQuery = usersQuery.lte('createdAt', end)
    }

    // ソートを適用（計算フィールドでない場合）
    if (!isComputedField) {
      usersQuery = usersQuery.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      usersQuery = usersQuery.order('createdAt', { ascending: false })
    }

    // ページネーション（計算フィールドでない場合）
    if (!isComputedField) {
      usersQuery = usersQuery.range((page - 1) * limit, page * limit - 1)
    }

    const { data: users, error: usersError } = await usersQuery

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 })
    }

    // 総数を取得
    let countQuery = supabase
      .from('User')
      .select('*', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (role) {
      countQuery = countQuery.eq('role', role)
    }
    if (dateRange) {
      const [start, end] = dateRange.split(',')
      if (start) countQuery = countQuery.gte('createdAt', start)
      if (end) countQuery = countQuery.lte('createdAt', end)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('Error counting users:', countError)
      return NextResponse.json({ message: 'Failed to count users' }, { status: 500 })
    }

    // 各ユーザーの統計を計算
    const usersWithStats = users.map(user => {
      const totalSurveys = user.surveys.length
      const activeSurveys = user.surveys.filter(s => s.status === 'ACTIVE').length
      const draftSurveys = user.surveys.filter(s => s.status === 'DRAFT').length
      const closedSurveys = user.surveys.filter(s => s.status === 'CLOSED').length
      const totalResponses = user.surveys.reduce((sum, survey) => sum + survey._count.responses, 0)
      const publishRate = totalSurveys > 0 ? Math.round((activeSurveys / totalSurveys) * 100) : 0

      return {
        ...user,
        totalSurveys,
        activeSurveys,
        draftSurveys,
        closedSurveys,
        totalResponses,
        publishRate
      }
    })

    // 計算されたフィールドでソートする場合
    let sortedUsers = usersWithStats
    if (isComputedField) {
      sortedUsers = usersWithStats.sort((a, b) => {
        const aValue = a[sortBy as keyof typeof a] as number
        const bValue = b[sortBy as keyof typeof b] as number
        
        if (sortOrder === 'asc') {
          return aValue - bValue
        } else {
          return bValue - aValue
        }
      })
    }

    // 計算フィールドの場合はページネーションを適用
    const paginatedUsers = isComputedField 
      ? sortedUsers.slice((page - 1) * limit, page * limit)
      : sortedUsers

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch admin users:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
