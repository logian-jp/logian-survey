import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = await request.json()
    } catch (e) {
      console.error('Invalid JSON body', e)
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
    }

    const { ticketType, quantity = 1 } = body || {}
    if (!ticketType || typeof ticketType !== 'string') {
      return NextResponse.json({ message: 'Invalid ticketType' }, { status: 400 })
    }

    // FREEは購入不可
    if (ticketType === 'FREE') {
      return NextResponse.json({ message: 'FREE ticket cannot be purchased' }, { status: 400 })
    }

    console.log('[TicketPurchase] user=', session.user.id, 'type=', ticketType, 'qty=', quantity)

    // 既存のチケットを検索
    const existing = await (prisma as any).userTicket.findFirst({
      where: { userId: session.user.id, ticketType }
    })

    if (existing) {
      try {
        const updated = await (prisma as any).userTicket.update({
          where: { id: existing.id },
          data: {
            totalTickets: existing.totalTickets + quantity,
            remainingTickets: existing.remainingTickets + quantity
          }
        })
        return NextResponse.json({ ticket: updated })
      } catch (e: any) {
        console.error('Update userTicket failed', e)
        return NextResponse.json({ message: e?.message || 'Update failed' }, { status: 500 })
      }
    }

    try {
      const created = await (prisma as any).userTicket.create({
        data: {
          userId: session.user.id,
          ticketType,
          totalTickets: quantity,
          usedTickets: 0,
          remainingTickets: quantity,
          expiresAt: null
        }
      })
      return NextResponse.json({ ticket: created })
    } catch (e: any) {
      console.error('Create userTicket failed', e)
      return NextResponse.json({ message: e?.message || 'Create failed' }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Mock ticket purchase error:', error)
    return NextResponse.json({ message: error?.message || 'Internal server error' }, { status: 500 })
  }
}
