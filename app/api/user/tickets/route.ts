import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // ユーザーのチケット情報を取得
    const tickets = await prisma.userTicket.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        ticketType: 'asc'
      }
    })

    // FREEチケットが存在しない場合はデフォルトで追加
    const freeTicket = tickets.find(t => t.ticketType === 'FREE')
    if (!freeTicket) {
      tickets.unshift({
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
      tickets
    })
  } catch (error) {
    console.error('Failed to fetch user tickets:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
