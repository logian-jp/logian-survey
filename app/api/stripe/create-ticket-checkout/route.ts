import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TICKET_PRICES: Record<string, number> = {
  'FREE': 0,
  'STANDARD': 2980,
  'PROFESSIONAL': 10000,
  'ENTERPRISE': 50000
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { ticketType, quantity = 1, discountCode } = await request.json()

    if (!ticketType || !TICKET_PRICES[ticketType]) {
      return NextResponse.json(
        { message: 'Invalid ticket type' },
        { status: 400 }
      )
    }

    let price = TICKET_PRICES[ticketType]
    
    if (price === 0) {
      return NextResponse.json(
        { message: 'Free tickets cannot be purchased' },
        { status: 400 }
      )
    }

    // 割引コードが提供された場合、検証して価格を調整
    if (discountCode) {
      try {
        // Supabase SDKを使用して割引リンクを検索
        const { data: discountLink, error: discountError } = await supabase
          .from('DiscountLink')
          .select('*')
          .eq('code', discountCode)
          .single()

        if (discountError && discountError.code !== 'PGRST116') {
          console.error('Error fetching discount link:', discountError)
        }

        if (discountLink && 
            discountLink.isActive && 
            discountLink.targetTicketType === ticketType &&
            new Date() >= discountLink.validFrom &&
            new Date() <= discountLink.validUntil &&
            (!discountLink.maxUses || discountLink.currentUses < discountLink.maxUses)) {
          
          price = discountLink.discountedPrice
          console.log('Discount applied:', {
            code: discountLink.code,
            originalPrice: TICKET_PRICES[ticketType],
            discountedPrice: discountLink.discountedPrice,
            discountValue: discountLink.discountValue,
            discountType: discountLink.discountType
          })
        } else {
          console.log('Discount code validation failed:', {
            found: !!discountLink,
            isActive: discountLink?.isActive,
            targetMatch: discountLink?.targetTicketType === ticketType,
            validDate: discountLink ? new Date() >= discountLink.validFrom && new Date() <= discountLink.validUntil : false,
            usageLimit: discountLink ? (!discountLink.maxUses || discountLink.currentUses < discountLink.maxUses) : false
          })
        }
      } catch (error) {
        console.error('Error validating discount code:', error)
      }
    }

    console.log('Creating checkout session for ticket purchase:', {
      userId: session.user.id,
      ticketType,
      quantity,
      price
    })

    const checkoutSession = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `${ticketType}チケット`,
              description: `アンケート作成用の${ticketType}チケット ${quantity}枚`,
            },
            unit_amount: price,
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/tickets?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/tickets?canceled=true`,
      metadata: {
        userId: session.user.id,
        ticketType: ticketType,
        quantity: quantity.toString(),
        type: 'ticket_purchase',
        ...(discountCode ? { discountCode } : {})
      },
    })

    console.log('Checkout session created:', checkoutSession.id)

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Failed to create ticket checkout session:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

