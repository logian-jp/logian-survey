import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { returnUrl } = await request.json()

    // Stripe Customerを取得または作成
    const customer = await getOrCreateStripeCustomer(session.user.id, session.user.email!)

    // 顧客ポータルセッションを作成
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl || `${process.env.NEXTAUTH_URL}/settings`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
