import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

// GET: お知らせ一覧取得（テスト用）
export async function GET() {
  try {
    console.log('GET /api/admin/announcements/test called')
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session ? 'exists' : 'null')
    
    if (!session?.user?.id) {
      console.log('No session or user ID')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック
    const isAdmin = session.user.role === 'ADMIN'
    console.log('User email:', session.user.email, 'Is admin:', isAdmin)
    
    if (!isAdmin) {
      console.log('Non-admin user attempted access')
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    // シンプルなテスト
    console.log('Testing database connection...')
    
    try {
      // まず基本的なクエリをテスト
      const userCount = await prisma.user.count()
      console.log('User count:', userCount)
      
      // お知らせテーブルの存在確認
      const announcementCount = await prisma.announcement.count()
      console.log('Announcement count:', announcementCount)
      
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        userCount,
        announcementCount
      })
      
    } catch (dbError: any) {
      console.error('Database test error:', {
        code: dbError.code,
        message: dbError.message,
        meta: dbError.meta
      })
      
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: {
          code: dbError.code,
          message: dbError.message
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
