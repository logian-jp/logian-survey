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

    // 検索条件を構築
    const where: any = {}
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { inviterName: { contains: search, mode: 'insensitive' } },
        { inviterEmail: { contains: search, mode: 'insensitive' } },
        { invitedName: { contains: search, mode: 'insensitive' } },
        { invitedEmail: { contains: search, mode: 'insensitive' } }
      ]
    }

    // ステータスフィルター
    if (status === 'used') {
      where.isUsed = true
    } else if (status === 'unused') {
      where.isUsed = false
      where.expiresAt = {
        gt: new Date()
      }
    } else if (status === 'expired') {
      where.isUsed = false
      where.expiresAt = {
        lte: new Date()
      }
    }

    // ソート条件を構築
    const orderBy: any = {}
    if (sortBy === 'inviter.name') {
      orderBy.inviter = { name: sortOrder }
    } else {
      orderBy[sortBy] = sortOrder
    }

    // 招待履歴を取得
    const [invitations, totalCount] = await Promise.all([
      prisma.invitation.findMany({
        where,
        include: {
          inviter: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          usedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.invitation.count({ where })
    ])

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
