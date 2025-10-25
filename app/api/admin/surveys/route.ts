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
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Supabaseクエリを構築
    let surveysQuery = supabase
      .from('Survey')
      .select(`
        *,
        user:User!userId(id, name, email)
      `)

    let countQuery = supabase
      .from('Survey')
      .select('*', { count: 'exact', head: true })

    // 検索条件を適用
    if (search) {
      const searchFilter = `title.ilike.%${search}%,user.name.ilike.%${search}%,user.email.ilike.%${search}%`
      surveysQuery = surveysQuery.or(searchFilter)
      countQuery = countQuery.or(searchFilter)
    }

    if (status) {
      surveysQuery = surveysQuery.eq('status', status)
      countQuery = countQuery.eq('status', status)
    }

    // ソート条件を適用
    if (sortBy === 'user.name') {
      surveysQuery = surveysQuery.order('user.name', { ascending: sortOrder === 'asc' })
    } else {
      surveysQuery = surveysQuery.order(sortBy, { ascending: sortOrder === 'asc' })
    }

    // ページネーションを適用
    surveysQuery = surveysQuery.range((page - 1) * limit, page * limit - 1)

    // アンケート一覧と総数を並行取得
    const [surveysResult, countResult] = await Promise.all([
      surveysQuery,
      countQuery
    ])

    const { data: surveys, error: surveysError } = surveysResult
    const { count: totalCount, error: countError } = countResult

    if (surveysError) {
      console.error('Error fetching surveys:', surveysError)
      return NextResponse.json({ message: 'Failed to fetch surveys' }, { status: 500 })
    }

    if (countError) {
      console.error('Error fetching survey count:', countError)
      return NextResponse.json({ message: 'Failed to fetch count' }, { status: 500 })
    }

    // レスポンス数を別途取得（_countの代替）
    const surveysWithCounts = await Promise.all(
      surveys?.map(async (survey) => {
        const { count: responseCount } = await supabase
          .from('Response')
          .select('*', { count: 'exact', head: true })
          .eq('surveyId', survey.id)
        
        return {
          ...survey,
          _count: { responses: responseCount || 0 }
        }
      }) || []
    )

    const safeTotalCount = totalCount ?? 0
    return NextResponse.json({
      surveys: surveysWithCounts,
      pagination: {
        page,
        limit,
        total: safeTotalCount,
        totalPages: Math.ceil(safeTotalCount / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch admin surveys:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
