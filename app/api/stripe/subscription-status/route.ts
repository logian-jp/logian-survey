import { NextResponse } from 'next/server'

export async function GET() {
  // NOTE: チケット制度移行により完全無効化
  return NextResponse.json({
    message: 'Subscription status disabled - migrated to ticket system',
    hasActiveSubscription: false,
    planType: 'TICKET_SYSTEM'
  })
}
