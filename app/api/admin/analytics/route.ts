import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    // 基本的なユーザー統計のみ取得
    const totalUsers = await prisma.user.count()
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      }
    })

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