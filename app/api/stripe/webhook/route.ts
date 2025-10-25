import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // NOTE: チケット制度移行により完全無効化
  console.log('Stripe webhook received but disabled - migrated to ticket system')
  return NextResponse.json({ 
    received: true,
    message: 'Webhook disabled - migrated to ticket system'
  })
}

