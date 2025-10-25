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

    const userId = session.user.id

    // ユーザーのチケット情報を取得 (Supabase SDK使用)
    console.log('Fetching user tickets for userId:', userId)
    const { data: userTickets, error: ticketError } = await supabase
      .from('UserTicket')
      .select('*')
      .eq('userId', userId)
      .order('ticketType', { ascending: false })
    
    if (ticketError) {
      console.error('Error fetching user tickets:', ticketError)
      return NextResponse.json({ message: 'Failed to fetch user tickets' }, { status: 500 })
    }
    
    console.log('User tickets fetched successfully:', userTickets?.length || 0)

    // 最も高いチケットタイプを決定
    let planType = 'FREE'
    if (userTickets && userTickets.length > 0) {
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
      tickets: userTickets || []
    }

    return NextResponse.json({ userPlan })
  } catch (error) {
    console.error('Failed to fetch user plan:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
