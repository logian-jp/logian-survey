import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
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
      // 総ユーザー数 (Supabase SDK使用)
      supabase.from('User').select('*', { count: 'exact', head: true }),
      
      // 総アンケート数
      supabase.from('Survey').select('*', { count: 'exact', head: true }),
      
      // 総回答数
      supabase.from('Response').select('*', { count: 'exact', head: true }),
      
      // アクティブユーザー数（過去30日以内に更新されたユーザー）
      supabase.from('User')
        .select('*', { count: 'exact', head: true })
        .gte('updatedAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      // ステータス別アンケート数（手動集計）
      supabase.from('Survey').select('status'),
      
      // 最近登録されたユーザー（上位10件）
      supabase.from('User')
        .select('id, name, email, createdAt')
        .order('createdAt', { ascending: false })
        .limit(10),
      
      // 最近作成されたアンケート（上位10件）
      supabase.from('Survey')
        .select(`
          id, title, status, createdAt,
          user:User(name, email)
        `)
        .order('createdAt', { ascending: false })
        .limit(10),
      
      // アンケート作成数上位ユーザー
      supabase.from('User')
        .select(`
          id, name, email,
          surveys:Survey(id)
        `)
    ])
    
    // ユーザー別の詳細統計（上位10件）
    const { data: userStats, error: userStatsError } = await supabase
      .from('User')
      .select(`
        id, name, email, createdAt, updatedAt,
        surveys:Survey(id, title, status, createdAt)
      `)
      .order('createdAt', { ascending: false })
      .limit(10)

    if (userStatsError) {
      console.error('Error fetching user stats:', userStatsError)
      return NextResponse.json({ message: 'Failed to fetch user statistics' }, { status: 500 })
    }
    
    // 各ユーザーの統計を計算（レスポンス数は別途取得が必要）
    const userStatistics = await Promise.all(
      userStats?.map(async (user) => {
        const activeSurveys = user.surveys?.filter(survey => survey.status === 'ACTIVE').length || 0
        const draftSurveys = user.surveys?.filter(survey => survey.status === 'DRAFT').length || 0
        const closedSurveys = user.surveys?.filter(survey => survey.status === 'CLOSED').length || 0
        
        // ユーザーのアンケートのレスポンス数を取得
        const surveyIds = user.surveys?.map(s => s.id) || []
        let totalSurveyResponses = 0
        
        if (surveyIds.length > 0) {
          const { count } = await supabase
            .from('Response')
            .select('*', { count: 'exact', head: true })
            .in('surveyId', surveyIds)
          
          totalSurveyResponses = count || 0
        }
        
        return {
          ...user,
          totalSurveyResponses,
          activeSurveys,
          draftSurveys,
          closedSurveys
        }
      }) || []
    )
    
    // ステータス別アンケート数を手動で集計
    const statusCounts = surveysByStatus.data?.reduce((acc, survey) => {
      acc[survey.status] = (acc[survey.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // トップユーザー（アンケート数順）を手動ソート
    const sortedTopUsers = topUsers.data?.map(user => ({
      ...user,
      surveyCount: user.surveys?.length || 0
    })).sort((a, b) => b.surveyCount - a.surveyCount).slice(0, 10) || []

    // レスポンス数を各アンケートに追加
    const surveysWithResponses = await Promise.all(
      recentSurveys.data?.map(async (survey) => {
        const { count: responseCount } = await supabase
          .from('Response')
          .select('*', { count: 'exact', head: true })
          .eq('surveyId', survey.id)
        
        return {
          ...survey,
          responseCount: responseCount || 0
        }
      }) || []
    )

    return NextResponse.json({
      overview: {
        totalUsers: totalUsers.count || 0,
        totalSurveys: totalSurveys.count || 0,
        totalResponses: totalResponses.count || 0,
        activeUsers: activeUsers.count || 0,
        surveysByStatus: statusCounts
      },
      recentUsers: recentUsers.data || [],
      recentSurveys: surveysWithResponses,
      topUsers: sortedTopUsers,
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
