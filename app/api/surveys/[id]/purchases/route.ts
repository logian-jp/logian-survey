import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: surveyId } = await params

    // アンケートの存在確認と権限チェック
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        OR: [
          { userId: session.user.id },
          {
            surveyUsers: {
              some: {
                userId: session.user.id,
                permission: { in: ['EDIT', 'ADMIN', 'VIEW'] }
              }
            }
          }
        ]
      },
      select: { userId: true, ticketType: true, ticketId: true, paymentId: true }
    })

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // 購入記録は所有者のみが閲覧可能
    if (survey.userId !== session.user.id) {
      return NextResponse.json({ error: 'Only survey owner can view purchases' }, { status: 403 })
    }

    let purchases = []
    
    // 無料チケット以外の場合のみ購入記録を取得
    if (survey?.ticketType && survey.ticketType !== 'FREE') {
      const ticketPurchases = await prisma.ticketPurchase.findMany({
        where: { 
          userId: session.user.id,
          ticketType: survey.ticketType
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          purchasedAt: 'desc'
        }
      })
      
      purchases = ticketPurchases
    }

    return NextResponse.json({ purchases })
  } catch (error) {
    console.error('Error fetching survey purchases:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
