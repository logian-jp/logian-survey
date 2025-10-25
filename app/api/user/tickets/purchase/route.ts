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
    const { data: existing, error: findError } = await supabase
      .from('UserTicket')
      .select('*')
      .eq('userId', session.user.id)
      .eq('ticketType', ticketType)
      .single()

    if (existing && !findError) {
      // 既存のチケットを更新
      const { data: updated, error: updateError } = await supabase
        .from('UserTicket')
        .update({
          totalTickets: existing.totalTickets + quantity,
          remainingTickets: existing.remainingTickets + quantity
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Update userTicket failed', updateError)
        return NextResponse.json({ message: 'Update failed' }, { status: 500 })
      }
      
      return NextResponse.json({ ticket: updated })
    }

    // 新しいチケットを作成
    const { data: created, error: createError } = await supabase
      .from('UserTicket')
      .insert({
        userId: session.user.id,
        ticketType,
        totalTickets: quantity,
        usedTickets: 0,
        remainingTickets: quantity,
        expiresAt: null
      })
      .select()
      .single()

    if (createError) {
      console.error('Create userTicket failed', createError)
      return NextResponse.json({ message: 'Create failed' }, { status: 500 })
    }

    return NextResponse.json({ ticket: created })
  } catch (error: any) {
    console.error('Mock ticket purchase error:', error)
    return NextResponse.json({ message: error?.message || 'Internal server error' }, { status: 500 })
  }
}
