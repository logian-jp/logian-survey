import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('=== Admin Stats API Called ===')
    await requireAdmin()
    console.log('Admin access verified')
    
    // 基本統計情報を取得
    const [
      totalUsers,
      totalSurveys,
      totalResponses,
      activeUsers,
      surveysByStatus,
      recentUsers,
      recentSurveys,
      topUsers
    ] = await Promise.all([
      // 総ユーザー数
      prisma.user.count(),
      
      // 総アンケート数
      prisma.survey.count(),
      
      // 総回答数
      prisma.response.count(),
      
      // アクティブユーザー数（過去30日以内にログイン）
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // ステータス別アンケート数
      prisma.survey.groupBy({
        by: ['status'],
        _count: {
          status: true
        }
      }),
      
      // 最近登録されたユーザー（上位10件）
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }),
      
      // 最近作成されたアンケート（上位10件）
      prisma.survey.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              responses: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }),
      
      // アンケート作成数上位ユーザー
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              surveys: true
            }
          }
        },
        orderBy: {
          surveys: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ])
    
    // ユーザー別の詳細統計（上位10件）
    const userStats = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        surveys: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                responses: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    // 各ユーザーの統計を計算
    const userStatistics = userStats.map(user => {
      const totalSurveyResponses = user.surveys.reduce((sum, survey) => sum + survey._count.responses, 0)
      const activeSurveys = user.surveys.filter(survey => survey.status === 'ACTIVE').length
      const draftSurveys = user.surveys.filter(survey => survey.status === 'DRAFT').length
      const closedSurveys = user.surveys.filter(survey => survey.status === 'CLOSED').length
      
      return {
        ...user,
        totalSurveyResponses,
        activeSurveys,
        draftSurveys,
        closedSurveys
      }
    })
    
    return NextResponse.json({
      overview: {
        totalUsers,
        totalSurveys,
        totalResponses,
        activeUsers,
        surveysByStatus: surveysByStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>)
      },
      recentUsers,
      recentSurveys,
      topUsers,
      userStatistics
    })
  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { 
        message: 'Failed to fetch admin statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
