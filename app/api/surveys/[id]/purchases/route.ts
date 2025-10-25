import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // アンケートの存在確認 (Supabase SDK使用)
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select('userId, ticketType, ticketId, paymentId')
      .eq('id', surveyId)
      .single()

    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ error: 'Failed to fetch survey' }, { status: 500 })
    }

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    // 購入記録は所有者のみが閲覧可能
    if (survey.userId !== session.user.id) {
      return NextResponse.json({ error: 'Only survey owner can view purchases' }, { status: 403 })
    }

    let purchases: any[] = []
    
    // 無料チケット以外の場合のみ購入記録を取得
    if (survey?.ticketType && survey.ticketType !== 'FREE') {
      // チケット購入記録を取得 (Supabase SDK使用)
      const { data: ticketPurchases, error: purchaseError } = await supabase
        .from('TicketPurchase')
        .select(`
          *,
          user:User(id, name, email)
        `)
        .eq('userId', session.user.id)
        .eq('ticketType', survey.ticketType)
        .order('purchasedAt', { ascending: false })

      if (purchaseError) {
        console.error('Error fetching ticket purchases:', purchaseError)
        return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 })
      }
      
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
