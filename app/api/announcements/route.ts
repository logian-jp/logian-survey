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

// GET: ユーザー向けお知らせ取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザー情報を確認 (Supabase SDK使用)
    console.log('Fetching user for announcements:', session.user.id)
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      console.error('User not found:', userError)
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // ユーザーに配信されたお知らせを取得 (Supabase SDK使用)
    console.log('Fetching announcement deliveries for user:', user.id)
    const { data: deliveries, error: deliveryError } = await supabase
      .from('AnnouncementDelivery')
      .select(`
        *,
        announcement:Announcement(*)
      `)
      .eq('userId', user.id)
      .neq('status', 'HIDDEN')
      .order('createdAt', { ascending: false })

    if (deliveryError) {
      console.error('Error fetching announcements:', deliveryError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch announcements' 
      }, { status: 500 })
    }

    // お知らせ情報を整形
    const announcements = (deliveries || []).map(delivery => ({
      id: delivery.announcement?.id || delivery.id,
      title: delivery.announcement?.title || 'お知らせ',
      content: delivery.announcement?.content || '',
      priority: delivery.announcement?.priority || 'NORMAL',
      status: delivery.status,
      readAt: delivery.readAt,
      createdAt: delivery.createdAt,
      announcementCreatedAt: delivery.announcement?.createdAt || delivery.createdAt
    }))
    
    console.log('Formatted announcements:', announcements.length)

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
