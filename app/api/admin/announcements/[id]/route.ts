import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// GET: 個別お知らせ取得
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    const isAdmin = adminEmails.includes(session.user.email || '')
    
    if (!isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        deliveries: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                userPlan: {
                  select: {
                    planType: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json(
        { message: 'お知らせが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      announcement
    })

  } catch (error) {
    console.error('Announcement fetch error:', error)
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

// PUT: お知らせ更新
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    const isAdmin = adminEmails.includes(session.user.email || '')
    
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

    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        title,
        content,
        type,
        priority: priority || 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        targetPlans: targetPlans ? targetPlans : undefined,
        conditions: conditions ? conditions : undefined
      }
    })

    return NextResponse.json({
      success: true,
      message: 'お知らせを更新しました',
      announcement
    })

  } catch (error) {
    console.error('Announcement update error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'お知らせの更新に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE: お知らせ削除
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    const isAdmin = adminEmails.includes(session.user.email || '')
    
    if (!isAdmin) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    // お知らせが存在するかチェック
    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: params.id }
    })

    if (!existingAnnouncement) {
      return NextResponse.json(
        { message: 'お知らせが見つかりません' },
        { status: 404 }
      )
    }

    // お知らせを削除（関連する配信レコードも自動削除される）
    await prisma.announcement.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'お知らせを削除しました'
    })

  } catch (error) {
    console.error('Announcement deletion error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'お知らせの削除に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
