import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的ルートとして設定
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーがアクセス可能なアンケートのIDを取得 (Supabase SDK使用)
    const { data: userSurveys, error: userSurveyError } = await supabase
      .from('SurveyUser')
      .select('surveyId')
      .eq('userId', session.user.id)
      .in('permission', ['ADMIN', 'EDIT', 'VIEW'])

    if (userSurveyError) {
      console.error('Error fetching user surveys:', userSurveyError)
    }

    // ユーザーが所有者のアンケートも取得 (Supabase SDK使用)
    const { data: ownedSurveys, error: ownedSurveyError } = await supabase
      .from('Survey')
      .select('id')
      .eq('userId', session.user.id)

    if (ownedSurveyError) {
      console.error('Error fetching owned surveys:', ownedSurveyError)
    }

    const ownedSurveyIds = (ownedSurveys || []).map(s => s.id)
    const userSurveyIds = (userSurveys || []).map(su => su.surveyId)
    const allSurveyIds = Array.from(new Set([...userSurveyIds, ...ownedSurveyIds]))

    if (allSurveyIds.length === 0) {
      return NextResponse.json([])
    }

    // アンケートの詳細情報を取得 (Supabase SDK使用)
    const { data: surveys, error: surveyError } = await supabase
      .from('Survey')
      .select('*')
      .in('id', allSurveyIds)
      .eq('status', 'ACTIVE')

    if (surveyError) {
      console.error('Error fetching surveys:', surveyError)
      return NextResponse.json({ error: 'Failed to fetch survey alerts' }, { status: 500 })
    }

    // 各アンケートの回答数を別途取得
    const surveysWithCounts = await Promise.all(
      (surveys || []).map(async (survey) => {
        const { count } = await supabase
          .from('Response')
          .select('*', { count: 'exact', head: true })
          .eq('surveyId', survey.id)

        return {
          ...survey,
          _count: {
            responses: count || 0
          }
        }
      })
    )

    const alerts = []

    for (const survey of surveysWithCounts) {
      const currentResponses = survey._count.responses
      const now = new Date()

      // 回答数上限に近づいている場合
      if (survey.maxResponses && currentResponses >= survey.maxResponses * 0.9) {
        alerts.push({
          id: `max-responses-${survey.id}`,
          type: 'warning',
          title: '回答数上限に近づいています',
          message: `${survey.title} の回答数が上限の90%に達しました（${currentResponses}/${survey.maxResponses}件）`,
          surveyId: survey.id,
          surveyTitle: survey.title,
          severity: currentResponses >= survey.maxResponses ? 'error' : 'warning'
        })
      }

      // 回答終了日時が近づいている場合
      if (survey.endDate) {
        const endDate = new Date(survey.endDate)
        const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysUntilEnd <= 3 && daysUntilEnd > 0) {
          alerts.push({
            id: `end-date-${survey.id}`,
            type: 'warning',
            title: '回答終了日時が近づいています',
            message: `${survey.title} の回答受付が${daysUntilEnd}日後に終了します`,
            surveyId: survey.id,
            surveyTitle: survey.title,
            severity: daysUntilEnd <= 1 ? 'error' : 'warning'
          })
        } else if (daysUntilEnd <= 0) {
          alerts.push({
            id: `end-date-passed-${survey.id}`,
            type: 'error',
            title: '回答終了日時を過ぎています',
            message: `${survey.title} の回答受付終了日時を過ぎていますが、まだアクティブです`,
            surveyId: survey.id,
            surveyTitle: survey.title,
            severity: 'error'
          })
        }
      }

      // 目標達成率が低い場合
      if (survey.targetResponses && currentResponses < survey.targetResponses * 0.5) {
        const achievementRate = Math.round((currentResponses / survey.targetResponses) * 100)
        alerts.push({
          id: `low-achievement-${survey.id}`,
          type: 'info',
          title: '目標達成率が低いです',
          message: `${survey.title} の目標達成率が${achievementRate}%です（${currentResponses}/${survey.targetResponses}件）`,
          surveyId: survey.id,
          surveyTitle: survey.title,
          severity: 'info'
        })
      }

      // 回答数が少ない場合（目標値がない場合）
      if (!survey.targetResponses && currentResponses < 5) {
        alerts.push({
          id: `low-responses-${survey.id}`,
          type: 'info',
          title: '回答数が少ないです',
          message: `${survey.title} の回答数が${currentResponses}件と少ないです`,
          surveyId: survey.id,
          surveyTitle: survey.title,
          severity: 'info'
        })
      }
    }

    // 重要度順にソート（error > warning > info）
    const severityOrder: { [key: string]: number } = { error: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Failed to fetch survey alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
