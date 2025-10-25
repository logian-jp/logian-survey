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
    let invitationsQuery = supabase
      .from('Invitation')
      .select(`
        *,
        inviter:User!inviterId(id, name, email),
        usedByUser:User!usedByUserId(id, name, email)
      `)

    let countQuery = supabase
      .from('Invitation')
      .select('*', { count: 'exact', head: true })

    // 検索条件を適用
    if (search) {
      const searchFilter = `code.ilike.%${search}%,inviterName.ilike.%${search}%,inviterEmail.ilike.%${search}%,invitedName.ilike.%${search}%,invitedEmail.ilike.%${search}%`
      invitationsQuery = invitationsQuery.or(searchFilter)
      countQuery = countQuery.or(searchFilter)
    }

    // ステータスフィルター
    if (status === 'used') {
      invitationsQuery = invitationsQuery.eq('isUsed', true)
      countQuery = countQuery.eq('isUsed', true)
    } else if (status === 'unused') {
      const now = new Date().toISOString()
      invitationsQuery = invitationsQuery.eq('isUsed', false).gt('expiresAt', now)
      countQuery = countQuery.eq('isUsed', false).gt('expiresAt', now)
    } else if (status === 'expired') {
      const now = new Date().toISOString()
      invitationsQuery = invitationsQuery.eq('isUsed', false).lte('expiresAt', now)
      countQuery = countQuery.eq('isUsed', false).lte('expiresAt', now)
    }

    // ソート条件を適用
    if (sortBy === 'inviter.name') {
      invitationsQuery = invitationsQuery.order('inviter.name', { ascending: sortOrder === 'asc' })
    } else {
      invitationsQuery = invitationsQuery.order(sortBy, { ascending: sortOrder === 'asc' })
    }

    // ページネーションを適用
    invitationsQuery = invitationsQuery.range((page - 1) * limit, page * limit - 1)

    // 招待履歴と総数を並行取得
    const [invitationsResult, countResult] = await Promise.all([
      invitationsQuery,
      countQuery
    ])

    const { data: invitations, error: invitationsError } = invitationsResult
    const { count: totalCount, error: countError } = countResult

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return NextResponse.json({ message: 'Failed to fetch invitations' }, { status: 500 })
    }

    if (countError) {
      console.error('Error fetching invitation count:', countError)
      return NextResponse.json({ message: 'Failed to fetch count' }, { status: 500 })
    }

    return NextResponse.json({
      invitations,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Failed to fetch admin invitations:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
