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

    // 管理者権限チェック
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // 期間の取得（デフォルトは過去30日）
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // チケット購入統計
    const ticketPurchases = await (prisma as any).ticketPurchase.findMany({
      where: {
        status: 'ACTIVE',
        purchasedAt: {
          gte: startDate
        }
      },
      select: {
        ticketType: true,
        amount: true,
        purchasedAt: true,
        metadata: true
      }
    })

    console.log('Ticket purchases found:', ticketPurchases.length)

    // チケット使用統計
    const userTickets = await (prisma as any).userTicket.findMany({
      select: {
        ticketType: true,
        totalTickets: true,
        usedTickets: true,
        remainingTickets: true,
        purchasedAt: true
      }
    })

    console.log('User tickets found:', userTickets.length)

    // チケットタイプ別の統計を計算
    const ticketStats = {
      FREE: { purchased: 0, used: 0, total: 0, revenue: 0 },
      STANDARD: { purchased: 0, used: 0, total: 0, revenue: 0 },
      PROFESSIONAL: { purchased: 0, used: 0, total: 0, revenue: 0 },
      ENTERPRISE: { purchased: 0, used: 0, total: 0, revenue: 0 }
    }

    // 購入統計の計算
    ticketPurchases.forEach((purchase: any) => {
      const ticketType = purchase.ticketType as keyof typeof ticketStats
      if (ticketStats[ticketType]) {
        ticketStats[ticketType].purchased += 1
        ticketStats[ticketType].revenue += purchase.amount || 0
      }
    })

    // 使用統計の計算
    userTickets.forEach((ticket: any) => {
      const ticketType = ticket.ticketType as keyof typeof ticketStats
      if (ticketStats[ticketType]) {
        ticketStats[ticketType].total += ticket.totalTickets
        ticketStats[ticketType].used += ticket.usedTickets
      }
    })

    // 使用率の計算
    const ticketUsageRates = Object.entries(ticketStats).map(([type, stats]) => ({
      ticketType: type,
      ticketName: {
        'FREE': '無料チケット',
        'STANDARD': 'スタンダードチケット',
        'PROFESSIONAL': 'プロフェッショナルチケット',
        'ENTERPRISE': 'エンタープライズチケット'
      }[type] || type,
      purchased: stats.purchased,
      total: stats.total,
      used: stats.used,
      remaining: stats.total - stats.used,
      usageRate: stats.total > 0 ? (stats.used / stats.total) * 100 : 0,
      revenue: stats.revenue
    }))

    // 月別売上推移
    const monthlyRevenue = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const dayRevenue = ticketPurchases
        .filter((purchase: any) => {
          const purchaseDate = new Date(purchase.purchasedAt)
          return purchaseDate >= dayStart && purchaseDate <= dayEnd
        })
        .reduce((sum: number, purchase: any) => sum + (purchase.amount || 0), 0)

      monthlyRevenue.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue
      })
    }

    // 総売上
    const totalRevenue = ticketPurchases.reduce((sum: number, purchase: any) => sum + (purchase.amount || 0), 0)

    // 総チケット数
    const totalTickets = userTickets.reduce((sum: number, ticket: any) => sum + ticket.totalTickets, 0)
    const totalUsedTickets = userTickets.reduce((sum: number, ticket: any) => sum + ticket.usedTickets, 0)
    const overallUsageRate = totalTickets > 0 ? (totalUsedTickets / totalTickets) * 100 : 0

    const responseData = {
      ticketStats: ticketUsageRates,
      monthlyRevenue,
      totalRevenue,
      totalTickets,
      totalUsedTickets,
      overallUsageRate,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    }

    console.log('Ticket stats response:', JSON.stringify(responseData, null, 2))

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Failed to fetch ticket stats:', error)
    console.error('Error details:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
