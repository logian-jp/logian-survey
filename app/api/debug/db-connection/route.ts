import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Testing database connection...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL)
    
    // 簡単なクエリでデータベース接続をテスト
    const result = await prisma.$queryRaw`SELECT 1 as test`
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
