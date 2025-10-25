import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// GET: お知らせ一覧取得
export async function GET() {
  try {
    console.log('GET /api/admin/announcements called')
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session ? 'exists' : 'null')
    
    if (!session?.user?.id) {
      console.log('No session or user ID')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック
    const isAdmin = session.user.role === 'ADMIN'
    console.log('User email:', session.user.email, 'Is admin:', isAdmin)
    
    if (!isAdmin) {
      console.log('Non-admin user attempted access')
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    try {
      console.log('Attempting to fetch announcements from database...')
      const announcements = await prisma.announcement.findMany({
        include: {
          deliveries: {
            select: {
              status: true,
              readAt: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      console.log('Found announcements:', announcements.length)

      // 統計情報を計算
      const announcementsWithStats = announcements.map((announcement: any) => {
        const totalSent = announcement.deliveries.length
        const totalRead = announcement.deliveries.filter((d: any) => d.readAt).length
        const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0

        return {
          ...announcement,
          readRate
        }
      })

      console.log('Returning announcements with stats')
      return NextResponse.json({
        success: true,
        announcements: announcementsWithStats,
        total: announcementsWithStats.length
      })
    } catch (dbError: any) {
      console.error('Database error details:', {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta,
        stack: dbError.stack
      })
      
      // データベースエラーの場合（テーブルが存在しない等）
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        console.log('Announcement table does not exist yet, returning empty list')
        return NextResponse.json({
          success: true,
          announcements: []
        })
      }
      
      // リレーションエラーの場合
      if (dbError.code === 'P2003' || dbError.message?.includes('relation')) {
        console.log('Relation error, returning empty list')
        return NextResponse.json({
          success: true,
          announcements: []
        })
      }
      
      throw dbError
    }

  } catch (error) {
    console.error('Announcements fetch error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'お知らせの取得に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST: 新しいお知らせ作成
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック
    const isAdmin = session.user.role === 'ADMIN'
    
    if (!isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      content,
      type,
      priority,
      scheduledAt,
      targetPlans,
      conditions
    } = body

    // バリデーション
    if (!title || !content) {
      return NextResponse.json(
        { message: 'タイトルと内容は必須です' },
        { status: 400 }
      )
    }

    // 時間型配信の場合は配信日時が必要
    if (type === 'SCHEDULED' && !scheduledAt) {
      return NextResponse.json(
        { message: '時間型配信の場合は配信日時を設定してください' },
        { status: 400 }
      )
    }

    // 条件型配信の場合は条件が必要
    if (type === 'CONDITIONAL' && (!conditions || conditions.length === 0)) {
      return NextResponse.json(
        { message: '条件型配信の場合は配信条件を設定してください' },
        { status: 400 }
      )
    }

    try {
      // お知らせを作成
      const announcement = await prisma.announcement.create({
        data: {
          title,
          content,
          type,
          priority: priority || 0,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          targetPlans: targetPlans ? targetPlans : undefined,
          conditions: conditions ? conditions : undefined,
          status: type === 'MANUAL' ? 'SENT' : 'SCHEDULED',
          createdBy: session.user.id // 配信者（管理者）のIDを記録
        }
      })

      // 手動配信の場合は即座に配信処理を開始
      if (type === 'MANUAL') {
        await distributeAnnouncement(announcement.id)
      }

      return NextResponse.json({
        success: true,
        message: 'お知らせを作成しました',
        announcement
      })
    } catch (dbError: any) {
      // データベースエラーの場合（テーブルが存在しない等）
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          message: 'データベースのテーブルがまだ作成されていません。管理者に連絡してください。'
        }, { status: 503 })
      }
      throw dbError
    }

  } catch (error) {
    console.error('Announcement creation error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'お知らせの作成に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// お知らせ配信処理
async function distributeAnnouncement(announcementId: string) {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        deliveries: true
      }
    })

    if (!announcement) {
      throw new Error('Announcement not found')
    }

    // 対象ユーザーを取得
    let whereCondition: any = {}

    // 対象プランのフィルタリング
    if (announcement.targetPlans && typeof announcement.targetPlans === 'string') {
      const targetPlans = JSON.parse(announcement.targetPlans)
      whereCondition.userPlan = {
        planType: {
          in: targetPlans
        }
      }
    }

    // 既に配信済みのユーザーを除外
    const deliveredUserIds = announcement.deliveries.map((d: any) => d.userId)
    if (deliveredUserIds.length > 0) {
      whereCondition.id = {
        notIn: deliveredUserIds
      }
    }

    const targetUsers = await prisma.user.findMany({
      where: whereCondition,
      // TODO: userPlan参照を削除（チケット制度移行のため）
    })

    // 配信レコードを作成
    const deliveryData = targetUsers.map((user: any) => ({
      announcementId,
      userId: user.id,
      status: 'SENT' as const
    }))

    if (deliveryData.length > 0) {
      await prisma.announcementDelivery.createMany({
        data: deliveryData
      })
    }

    // 統計を更新
    await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        totalSent: announcement.totalSent + deliveryData.length,
        status: 'SENT'
      }
    })

    console.log(`Distributed announcement ${announcementId} to ${deliveryData.length} users`)

  } catch (error) {
    console.error('Announcement distribution error:', error)
    throw error
  }
}
