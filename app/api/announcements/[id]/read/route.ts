import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// POST: お知らせを既読にする
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 配信レコードを更新
    const delivery = await prisma.announcementDelivery.updateMany({
      where: {
        announcementId: params.id,
        userId: session.user.id,
        status: 'SENT'
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    })

    if (delivery.count === 0) {
      return NextResponse.json(
        { message: 'お知らせが見つからないか、既に既読です' },
        { status: 404 }
      )
    }

    // お知らせの統計を更新
    await prisma.announcement.update({
      where: { id: params.id },
      data: {
        totalRead: {
          increment: 1
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'お知らせを既読にしました'
    })

  } catch (error) {
    console.error('Announcement read error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'お知らせの既読処理に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE: お知らせを非表示にする
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 配信レコードを非表示に更新
    const delivery = await prisma.announcementDelivery.updateMany({
      where: {
        announcementId: params.id,
        userId: session.user.id
      },
      data: {
        status: 'HIDDEN'
      }
    })

    if (delivery.count === 0) {
      return NextResponse.json(
        { message: 'お知らせが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'お知らせを非表示にしました'
    })

  } catch (error) {
    console.error('Announcement hide error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'お知らせの非表示処理に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
