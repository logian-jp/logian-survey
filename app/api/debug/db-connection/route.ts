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
  try {
    console.log('Testing database connection...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL)
    
    // 簡単なクエリでデータベース接続をテスト (Supabase SDK使用)
    const { data, error } = await supabase
      .from('User')
      .select('id')
      .limit(1)

    if (error) {
      throw error
    }

    const result = { connectionTest: 'success', sampleData: data }
    console.log('Database connection successful:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      result
    })
  } catch (error) {
    console.error('Database connection failed:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        databaseUrl: process.env.DATABASE_URL
      },
      { status: 500 }
    )
  }
}
