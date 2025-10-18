import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (session.user.email !== 'noutomi0729@gmail.com') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // 現在の日時
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // 基本統計
    const totalUsers = await prisma.user.count()
    const totalSurveys = await prisma.survey.count()
    const totalResponses = await prisma.response.count()

    // 今月の新規ユーザー
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      }
    })

    // 先月の新規ユーザー
    const newUsersLastMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      }
    })

    // ユーザー成長率
    const userGrowthRate = newUsersLastMonth > 0 
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100 
      : 0

    // 今月の売上（ユーザープランから計算）
    // 今月作成されたプランと、今月更新されたプランの両方を含める
    const userPlans = await prisma.userPlan.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          {
            createdAt: {
              gte: startOfMonth
            }
          },
          {
            updatedAt: {
              gte: startOfMonth
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    // プラン設定を取得
    const planConfigs = await prisma.planConfig.findMany({
      where: { isActive: true }
    })
    
    console.log('=== Analytics Debug ===')
    console.log('Found plan configs:', planConfigs.length)
    console.log('Plan configs:', planConfigs.map(p => ({ planType: p.planType, name: p.name, price: p.price })))
    console.log('User plans found:', userPlans.length)
    console.log('User plans:', userPlans.map(up => ({ planType: up.planType, userId: up.userId })))

    // 今月の売上計算
    let monthlyRevenue = 0
    const revenueBreakdown: { [key: string]: number } = {}

    for (const userPlan of userPlans) {
      const planConfig = planConfigs.find(p => p.planType === userPlan.planType)
      if (planConfig) {
        const revenue = planConfig.price
        monthlyRevenue += revenue
        revenueBreakdown[planConfig.name] = (revenueBreakdown[planConfig.name] || 0) + revenue
        console.log(`Revenue calculation: ${userPlan.planType} -> ${planConfig.name} -> ¥${revenue}`)
      } else {
        console.log(`No plan config found for: ${userPlan.planType}`)
      }
    }
    
    console.log('Monthly revenue calculated:', monthlyRevenue)
    console.log('Revenue breakdown:', revenueBreakdown)

    // 過去6ヶ月のユーザー推移
    const userGrowthData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const usersInMonth = await prisma.user.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      const totalUsersAtMonth = await prisma.user.count({
        where: {
          createdAt: {
            lte: monthEnd
          }
        }
      })

      userGrowthData.push({
        month: monthStart.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' }),
        newUsers: usersInMonth,
        totalUsers: totalUsersAtMonth
      })
    }

    // 解約予測（過去30日間のアクティビティが少ないユーザー）
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // lastLoginAtフィールドが存在しないため、updatedAtを使用
    const inactiveUsers = await prisma.user.findMany({
      where: {
        updatedAt: {
          lt: thirtyDaysAgo
        },
        userPlan: {
          status: 'ACTIVE'
        }
      },
      include: {
        userPlan: true
      }
    })

    // 売上予測（過去の成長率を基に）
    const lastThreeMonthsRevenue = []
    for (let i = 2; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthUserPlans = await prisma.userPlan.findMany({
        where: {
          status: 'ACTIVE',
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      let monthRevenue = 0
      for (const userPlan of monthUserPlans) {
        const planConfig = planConfigs.find(p => p.planType === userPlan.planType)
        if (planConfig) {
          monthRevenue += planConfig.price
        }
      }
      
      lastThreeMonthsRevenue.push(monthRevenue)
    }

    // 売上成長率計算
    const revenueGrowthRate = lastThreeMonthsRevenue.length >= 2 
      ? ((lastThreeMonthsRevenue[lastThreeMonthsRevenue.length - 1] - lastThreeMonthsRevenue[0]) / lastThreeMonthsRevenue[0]) * 100
      : 0

    // 来月の売上予測
    const predictedNextMonthRevenue = monthlyRevenue * (1 + revenueGrowthRate / 100)

    // プラン別ユーザー数
    const planUserCounts = await prisma.userPlan.groupBy({
      by: ['planType'],
      where: {
        status: 'ACTIVE'
      },
      _count: {
        planType: true
      }
    })

    const planUserBreakdown = planUserCounts.map(item => {
      const planConfig = planConfigs.find(p => p.planType === item.planType)
      return {
        planType: item.planType,
        planName: planConfig?.name || item.planType,
        userCount: item._count.planType
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        // 基本統計
        totalUsers,
        totalSurveys,
        totalResponses,
        newUsersThisMonth,
        newUsersLastMonth,
        userGrowthRate,
        
        // 売上情報
        monthlyRevenue,
        revenueBreakdown,
        predictedNextMonthRevenue,
        revenueGrowthRate,
        
        // 分析データ
        userGrowthData,
        inactiveUsers: inactiveUsers.length,
        churnRiskUsers: inactiveUsers.map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          lastLoginAt: user.updatedAt, // updatedAtを使用
          planType: user.userPlan?.planType
        })),
        
        // プラン別統計
        planUserBreakdown,
        
        // 計算日時
        calculatedAt: now.toISOString()
      }
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
