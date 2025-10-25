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

    console.log('Notification API called for user:', session.user.id)

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

    console.log('User surveys:', userSurveyIds.length)
    console.log('Owned surveys:', ownedSurveyIds.length)
    console.log('All survey IDs:', allSurveyIds)

    if (allSurveyIds.length === 0) {
      console.log('No surveys found for user')
      return NextResponse.json([])
    }

    // 最新10件の回答を取得 (Supabase SDK使用 - 複雑なネスト構造を段階的に取得)
    const { data: recentResponses, error: responseError } = await supabase
      .from('Response')
      .select(`
        id,
        surveyId,
        createdAt,
        survey:Survey(id, title),
        answers:Answer(id, value, question:Question(id, title, type))
      `)
      .in('surveyId', allSurveyIds)
      .order('createdAt', { ascending: false })
      .limit(10)

    if (responseError) {
      console.error('Error fetching responses:', responseError)
      return NextResponse.json({ error: 'Failed to fetch recent responses' }, { status: 500 })
    }

    console.log('Found responses:', recentResponses?.length || 0)

    // 通知用のデータを整形
    const notifications = (recentResponses || []).map(response => {
      console.log('Processing response:', response.id, 'with', response.answers?.length || 0, 'answers')
      
      // 名前やIDの情報を取得（NAMEタイプの質問から）
      const nameAnswer = (response.answers || []).find(answer => 
        answer.question?.type === 'NAME'
      )
      
      // メールアドレスの情報を取得（EMAILタイプの質問から）
      const emailAnswer = (response.answers || []).find(answer => 
        answer.question?.type === 'EMAIL'
      )

      // テキスト入力の回答からもIDを取得（最初のテキスト回答）
      const textAnswer = (response.answers || []).find(answer => 
        answer.question?.type === 'TEXT' && answer.value
      )

      const respondentId = nameAnswer?.value || 
                          emailAnswer?.value || 
                          textAnswer?.value || 
                          `回答者${response.id.slice(-6)}`

      console.log('Respondent ID:', respondentId)

      return {
        id: response.id,
        surveyId: response.survey?.id,
        surveyTitle: response.survey?.title,
        respondentId: respondentId,
        createdAt: response.createdAt,
        answerCount: response.answers?.length || 0
      }
    })

    console.log('Returning notifications:', notifications.length)
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Failed to fetch recent responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
