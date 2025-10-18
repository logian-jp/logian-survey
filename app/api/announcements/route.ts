import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AnnouncementStatus } from '@prisma/client'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// GET: ユーザー向けお知らせ取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userPlan: true,
        announcementDeliveries: {
          include: {
            announcement: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // ユーザーに配信されたお知らせを取得
    const deliveries = await prisma.announcementDelivery.findMany({
      where: {
        userId: user.id,
        status: {
          not: 'HIDDEN'
        }
      },
      include: {
        announcement: true
      },
      orderBy: [
        { announcement: { priority: 'desc' } },
        { createdAt: 'desc' }
      ]
    })

    // お知らせ情報を整形
    const announcements = deliveries.map(delivery => ({
      id: delivery.announcement.id,
      title: delivery.announcement.title,
      content: delivery.announcement.content,
      priority: delivery.announcement.priority,
      status: delivery.status,
      readAt: delivery.readAt,
      createdAt: delivery.createdAt,
      announcementCreatedAt: delivery.announcement.createdAt
    }))

    return NextResponse.json({
      success: true,
      announcements
    })

  } catch (error) {
    console.error('User announcements fetch error:', error)
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
