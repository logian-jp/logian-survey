import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function GET() {
  // TODO: userPlanテーブル削除により一時的に無効化
  return NextResponse.json({
    message: 'Vercel plan config debugging disabled - migrated to ticket system',
    userPlans: [],
    planConfigs: []
  })
  
  /* 元の実装（userPlanテーブル削除により一時的に無効化）
  try {
    console.log('Checking Vercel plan configuration...')
    
    // NOTE: チケット制度移行により無効化済み
    const planConfigs = [] // 空配列
    console.log('Found plan configs: 0 (disabled)')
    
    // NOTE: チケット制度移行により無効化済み
    const userPlans = [] // 空配列
    
    console.log('Found user plans:', userPlans.length)
    
    return NextResponse.json({
      success: true,
      planConfigs,
      userPlans,
      totalPlanConfigs: planConfigs.length,
      totalUserPlans: userPlans.length
    })
  } catch (error) {
    console.error('Error checking Vercel plan configuration:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to check plan configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
  */
}
