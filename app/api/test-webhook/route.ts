import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId, ticketType, quantity = 1 } = await request.json()
    
    console.log(`Test webhook: userId=${userId}, ticketType=${ticketType}, quantity=${quantity}`)
    
    // 既存のチケットを検索
    const existingTicket = await prisma.userTicket.findFirst({
      where: {
        userId,
        ticketType: ticketType as any
      }
    })
    
    console.log(`Existing ticket found:`, existingTicket)

    if (existingTicket) {
      // 既存のチケットを更新
      const updatedTicket = await prisma.userTicket.update({
        where: { id: existingTicket.id },
        data: {
          totalTickets: existingTicket.totalTickets + quantity,
          remainingTickets: existingTicket.remainingTickets + quantity
        }
      })
      console.log(`Updated existing ticket:`, updatedTicket)
      return NextResponse.json({ success: true, ticket: updatedTicket })
    } else {
      // 新しいチケットを作成
      const newTicket = await prisma.userTicket.create({
        data: {
          userId,
          ticketType: ticketType as any,
          totalTickets: quantity,
          usedTickets: 0,
          remainingTickets: quantity,
          expiresAt: null // 永続
        }
      })
      console.log(`Created new ticket:`, newTicket)
      return NextResponse.json({ success: true, ticket: newTicket })
    }
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ error: 'Failed to process test webhook' }, { status: 500 })
  }
}
