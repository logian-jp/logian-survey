import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Ticket purchases API - Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    })
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーのチケット購入履歴を取得
    const purchases = await prisma.ticketPurchase.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        survey: {
          select: {
            id: true,
            title: true,
            shareUrl: true
          }
        }
      }
    })

    console.log('Found ticket purchases:', purchases.length, 'purchases')
    console.log('Purchase details:', purchases)

    const response = { 
      purchases: purchases.map(purchase => ({
        id: purchase.id,
        ticketType: purchase.ticketType,
        amount: purchase.amount,
        currency: purchase.currency,
        createdAt: purchase.createdAt,
        survey: purchase.survey
      }))
    }

    console.log('Returning ticket purchases response:', response)
    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch ticket purchases:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
