import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // データベース接続テスト (Supabase SDK使用)
    const { count, error } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('Health check failed:', error)
      return NextResponse.json({
        status: 'unhealthy',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      userCount: count || 0,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
