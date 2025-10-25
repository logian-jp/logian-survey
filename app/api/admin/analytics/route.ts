import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // TODO: userPlanテーブルが削除されたため、一時的に簡易版を返す
    // 基本的なユーザー統計のみ取得 (Supabase SDK使用)
    const { count: totalUsers, error: totalUsersError } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })

    if (totalUsersError) {
      console.error('Error counting total users:', totalUsersError)
      return NextResponse.json({ message: 'Failed to get user count' }, { status: 500 })
    }
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const { count: newUsersThisMonth, error: newUsersError } = await supabase
      .from('User')
      .select('*', { count: 'exact', head: true })
      .gte('createdAt', startOfMonth.toISOString())

    if (newUsersError) {
      console.error('Error counting new users:', newUsersError)
      return NextResponse.json({ message: 'Failed to get new users count' }, { status: 500 })
    }

    return NextResponse.json({
      totalUsers,
      newUsersThisMonth,
      userGrowthRate: 0, // TODO: 前月比計算
      monthlyRevenue: 0, // TODO: 売上計算（userPlanテーブル復元後）
      revenueBreakdown: {},
      userGrowthData: [],
      inactiveUsersCount: 0,
      revenueProjection: [],
      planDistribution: []
    })

  } catch (error) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch analytics data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}