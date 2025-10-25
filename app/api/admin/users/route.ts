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

    // ユーザー一覧を取得
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              surveys: true
            }
          },
          surveys: {
            select: {
              id: true,
              status: true,
              _count: {
                select: {
                  responses: true
                }
              }
            }
          }
        },
        orderBy: isComputedField ? { createdAt: 'desc' } : orderBy, // 計算フィールドの場合はデフォルトソート
        // 計算フィールドの場合は全件取得してからソート
        ...(isComputedField ? {} : { skip: (page - 1) * limit, take: limit })
      }),
      prisma.user.count({ where })
    ])

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
