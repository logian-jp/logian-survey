import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // NOTE: チケット制度移行により完全無効化
  return NextResponse.json({
    message: 'Subscription cancellation disabled - migrated to ticket system'
  }, { status: 400 })
}
