import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: surveyId } = await params

    // アンケートの存在確認と権限チェック
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select(`
        *, 
        questions:Question!inner(*)
      `)
      .eq('id', surveyId)
      .or(`userId.eq.${session.user.id},surveyUsers.userId.eq.${session.user.id}`)
      .single()

    if (surveyError && surveyError.code !== 'PGRST116') {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }

    // 権限チェック（SurveyUserから）
    if (!survey) {
      const { data: surveyUser, error: surveyUserError } = await supabase
        .from('SurveyUser')
        .select('permission')
        .eq('surveyId', surveyId)
        .eq('userId', session.user.id)
        .in('permission', ['EDIT', 'ADMIN', 'VIEW'])
        .single()

      if (surveyUserError) {
        return NextResponse.json({ message: 'アンケートが見つからないか、アクセス権限がありません' }, { status: 404 })
      }

      // 権限があればアンケートを再取得
      const { data: authorizedSurvey, error: authorizedSurveyError } = await supabase
        .from('Survey')
        .select(`
          *, 
          questions:Question!inner(*)
        `)
        .eq('id', surveyId)
        .single()

      if (authorizedSurveyError) {
        console.error('Error fetching authorized survey:', authorizedSurveyError)
        return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
      }

      survey = authorizedSurvey
    }

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // 回答を取得 (Supabase SDK使用)
    const { data: responses, error: responsesError } = await supabase
      .from('Response')
      .select(`
        *,
        answers:Answer(*)
      `)
      .eq('surveyId', surveyId)
      .order('createdAt', { ascending: false })

    if (responsesError) {
      console.error('Error fetching responses:', responsesError)
      return NextResponse.json({ message: 'Failed to fetch responses' }, { status: 500 })
    }

    // 質問のオプションをパース
    const questionsWithParsedOptions = survey.questions.map((question: any) => ({
      id: question.id,
      type: question.type,
      title: question.title,
      description: question.description,
      required: question.required,
      order: question.order,
      options: question.options ? JSON.parse(question.options as string) : null,
      settings: question.settings ? JSON.parse(question.settings as string) : null,
    }))

    return NextResponse.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: questionsWithParsedOptions,
      responses: responses,
    })
  } catch (error) {
    console.error('Failed to fetch responses:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
