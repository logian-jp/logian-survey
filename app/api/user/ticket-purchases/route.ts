import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
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

    return NextResponse.json({ 
      purchases: purchases.map(purchase => ({
        id: purchase.id,
        ticketType: purchase.ticketType,
        amount: purchase.amount,
        currency: purchase.currency,
        createdAt: purchase.createdAt,
        survey: purchase.survey
      }))
    })
  } catch (error) {
    console.error('Failed to fetch ticket purchases:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
