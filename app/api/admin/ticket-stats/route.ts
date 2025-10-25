import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック (Supabase SDK使用)
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (userError || !users) {
      console.error('Error fetching user role:', userError)
      return NextResponse.json({ message: 'Failed to verify user' }, { status: 500 })
    }

    if (users.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // 期間の取得（デフォルトは過去30日）
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // チケット購入統計 (Supabase SDK使用)
    const { data: ticketPurchases, error: purchaseError } = await supabase
      .from('TicketPurchase')
      .select('ticketType, amount, purchasedAt, metadata')
      .eq('status', 'ACTIVE')
      .gte('purchasedAt', startDate.toISOString())

    if (purchaseError) {
      console.error('Error fetching ticket purchases:', purchaseError)
      return NextResponse.json({ message: 'Failed to fetch ticket purchases' }, { status: 500 })
    }

    console.log('Ticket purchases found:', ticketPurchases?.length || 0)

    // チケット使用統計 (Supabase SDK使用)
    const { data: userTickets, error: ticketError } = await supabase
      .from('UserTicket')
      .select('ticketType, totalTickets, usedTickets, remainingTickets, purchasedAt')

    if (ticketError) {
      console.error('Error fetching user tickets:', ticketError)
      return NextResponse.json({ message: 'Failed to fetch user tickets' }, { status: 500 })
    }

    console.log('User tickets found:', userTickets?.length || 0)

    // チケットタイプ別の統計を計算
    const ticketStats = {
      FREE: { purchased: 0, used: 0, total: 0, revenue: 0 },
      STANDARD: { purchased: 0, used: 0, total: 0, revenue: 0 },
      PROFESSIONAL: { purchased: 0, used: 0, total: 0, revenue: 0 },
      ENTERPRISE: { purchased: 0, used: 0, total: 0, revenue: 0 }
    }

    // 購入統計の計算
    ticketPurchases?.forEach((purchase: any) => {
      const ticketType = purchase.ticketType as keyof typeof ticketStats
      if (ticketStats[ticketType]) {
        ticketStats[ticketType].purchased += 1
        ticketStats[ticketType].revenue += purchase.amount || 0
      }
    })

    // 使用統計の計算
    userTickets?.forEach((ticket: any) => {
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

      const dayRevenue = (ticketPurchases || [])
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
    const totalRevenue = (ticketPurchases || []).reduce((sum: number, purchase: any) => sum + (purchase.amount || 0), 0)

    // 総チケット数
    const totalTickets = (userTickets || []).reduce((sum: number, ticket: any) => sum + ticket.totalTickets, 0)
    const totalUsedTickets = (userTickets || []).reduce((sum: number, ticket: any) => sum + ticket.usedTickets, 0)
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
