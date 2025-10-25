import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// POST: お知らせを既読にする
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 配信レコードを更新 (Supabase SDK使用)
    const { data, error } = await supabase
      .from('AnnouncementDelivery')
      .update({
        status: 'READ',
        readAt: new Date().toISOString()
      })
      .eq('announcementId', (await params).id)
      .eq('userId', session.user.id)
      .eq('status', 'SENT')
      .select()

    if (error) {
      console.error('Failed to update delivery status:', error)
      return NextResponse.json({ message: 'Failed to update read status' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { message: 'お知らせが見つからないか、既に既読です' },
        { status: 404 }
      )
    }

    // お知らせの統計を更新 (Supabase SDK使用)
    // Note: Supabaseでは直接incrementができないため、現在の値を取得して更新
    const { data: announcement, error: getAnnouncementError } = await supabase
      .from('Announcement')
      .select('totalRead')
      .eq('id', (await params).id)
      .single()

    if (!getAnnouncementError && announcement) {
      await supabase
        .from('Announcement')
        .update({
          totalRead: (announcement.totalRead || 0) + 1
        })
        .eq('id', (await params).id)
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 配信レコードを非表示に更新 (Supabase SDK使用)
    const { data, error } = await supabase
      .from('AnnouncementDelivery')
      .update({
        status: 'HIDDEN'
      })
      .eq('announcementId', (await params).id)
      .eq('userId', session.user.id)
      .select()

    if (error) {
      console.error('Failed to hide announcement:', error)
      return NextResponse.json({ message: 'Failed to hide announcement' }, { status: 500 })
    }

    if (!data || data.length === 0) {
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
