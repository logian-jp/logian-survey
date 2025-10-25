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

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // ユーザーのチケット情報を取得
    const { data: userTickets, error: ticketsError } = await supabase
      .from('UserTicket')
      .select('*')
      .eq('userId', session.user.id)

    if (ticketsError) {
      console.error('Error fetching user tickets:', ticketsError)
      return NextResponse.json({ message: 'Failed to fetch tickets' }, { status: 500 })
    }

    /* Original Prisma code:
    const userTickets = await prisma.userTicket.findMany({
      where: { userId },
      orderBy: { ticketType: 'desc' }
    })

    // プランスロット情報を構築
    const planSlots = {
      used: userTickets.reduce((sum, ticket) => sum + ticket.usedTickets, 0),
      total: userTickets.reduce((sum, ticket) => sum + ticket.totalTickets, 0),
      remaining: userTickets.reduce((sum, ticket) => sum + ticket.remainingTickets, 0),
      tickets: userTickets.map(ticket => ({
        ticketType: ticket.ticketType,
        used: ticket.usedTickets,
        total: ticket.totalTickets,
        remaining: ticket.remainingTickets
      }))
    }

    return NextResponse.json({ planSlots })
  } catch (error) {
    console.error('Failed to fetch plan slots:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
