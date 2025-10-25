import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, ticketType, quantity = 1 } = await request.json()
    
    console.log(`Test webhook: userId=${userId}, ticketType=${ticketType}, quantity=${quantity}`)
    
    // 既存のチケットを検索 (Supabase SDK使用)
    const { data: existingTicket, error: ticketError } = await supabase
      .from('UserTicket')
      .select('*')
      .eq('userId', userId)
      .eq('ticketType', ticketType)
      .single()
    
    console.log(`Existing ticket found:`, existingTicket)

    if (existingTicket && !ticketError) {
      // 既存のチケットを更新
      const { data: updatedTicket, error: updateError } = await supabase
        .from('UserTicket')
        .update({
          totalTickets: existingTicket.totalTickets + quantity,
          remainingTickets: existingTicket.remainingTickets + quantity
        })
        .eq('id', existingTicket.id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update ticket:', updateError)
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      console.log(`Updated existing ticket:`, updatedTicket)
      return NextResponse.json({ success: true, ticket: updatedTicket })
    } else {
      // 新しいチケットを作成 (Supabase SDK使用)
      const { data: newTicket, error: createError } = await supabase
        .from('UserTicket')
        .insert({
          userId,
          ticketType: ticketType,
          totalTickets: quantity,
          usedTickets: 0,
          remainingTickets: quantity,
          expiresAt: null // 永続
        })
        .select()
        .single()

      if (createError) {
        console.error('Failed to create ticket:', createError)
        return NextResponse.json({ success: false, error: createError.message }, { status: 500 })
      }

      console.log(`Created new ticket:`, newTicket)
      return NextResponse.json({ success: true, ticket: newTicket })
    }
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ error: 'Failed to process test webhook' }, { status: 500 })
  }
}
