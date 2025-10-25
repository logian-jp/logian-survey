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
    
    console.log('User tickets API - Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    })
    
    if (!session?.user?.id) {
      console.log('No session or user ID found')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーのチケット情報を取得 (Supabase SDK使用)
    console.log('Fetching user tickets for userId:', session.user.id)
    const { data: tickets, error: ticketError } = await supabase
      .from('UserTicket')
      .select('*')
      .eq('userId', session.user.id)
      .order('ticketType', { ascending: true })
    
    if (ticketError) {
      console.error('Error fetching user tickets:', ticketError)
      return NextResponse.json({ message: 'Failed to fetch tickets' }, { status: 500 })
    }
    
    console.log('User tickets fetched successfully:', tickets?.length || 0)

    // ticketsが配列でない場合は空配列として初期化
    const ticketsArray = tickets || []
    
    // FREEチケットが存在しない場合はデフォルトで追加
    const freeTicket = ticketsArray.find(t => t.ticketType === 'FREE')
    if (!freeTicket) {
      ticketsArray.unshift({
        id: 'free-default',
        userId: session.user.id,
        ticketType: 'FREE',
        totalTickets: 3,
        usedTickets: 0,
        remainingTickets: 3,
        purchasedAt: new Date(),
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    return NextResponse.json({
      tickets: ticketsArray
    })
  } catch (error) {
    console.error('Failed to fetch user tickets:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
