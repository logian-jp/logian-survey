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
    
    console.log('Ticket purchases API - Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    })
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーのチケット購入履歴を取得 (Supabase SDK使用)
    const { data: purchases, error: purchasesError } = await supabase
      .from('TicketPurchase')
      .select(`
        *,
        survey:Survey(id, title, shareUrl)
      `)
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })

    if (purchasesError) {
      console.error('Error fetching ticket purchases:', purchasesError)
      return NextResponse.json({ message: 'Failed to fetch ticket purchases' }, { status: 500 })
    }

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
