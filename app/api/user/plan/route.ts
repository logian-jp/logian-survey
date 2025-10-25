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

    const userId = session.user.id

    // ユーザーのチケット情報を取得
    const userTickets = await prisma.userTicket.findMany({
      where: { userId },
      orderBy: { ticketType: 'desc' }
    })

    // 最も高いチケットタイプを決定
    let planType = 'FREE'
    if (userTickets.length > 0) {
      const highestTicket = userTickets[0]
      planType = highestTicket.ticketType
    }

    // ユーザープラン情報を構築
    const userPlan = {
      planType,
      maxSurveys: planType === 'FREE' ? 1 : planType === 'STANDARD' ? 5 : planType === 'PROFESSIONAL' ? 20 : 100,
      maxResponses: planType === 'FREE' ? 100 : planType === 'STANDARD' ? 1000 : planType === 'PROFESSIONAL' ? 5000 : 50000,
      canCreateSurvey: true,
      canViewResponses: true,
      canExportData: planType !== 'FREE',
      canCustomizeLogo: planType === 'ENTERPRISE',
      tickets: userTickets
    }

    return NextResponse.json({ userPlan })
  } catch (error) {
    console.error('Failed to fetch user plan:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
