import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { getPlanLimits } from '@/lib/plan-limits'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// APIキー認証のヘルパー関数
async function authenticateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return null
  }

  const validApiKey = process.env.API_KEY
  if (apiKey !== validApiKey) {
    return null
  }

  return { apiKey }
}

// ユーザー認証のヘルパー関数
async function authenticateUser(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return null
  }
  return session.user
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // APIキーまたはユーザー認証をチェック
    const apiUser = await authenticateApiKey(request)
    const user = await authenticateUser(request)

    if (!apiUser && !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const format = searchParams.get('format') || 'json' // json, csv

    // アンケートの存在確認と権限チェック (Supabase SDK使用)
    let query = supabase
      .from('Survey')
      .select(`
        *,
        questions:Question(*, order),
        user:User(*)
      `)
      .eq('id', surveyId)

    // ユーザー認証の場合、自分のアンケートのみ
    if (user && !apiUser) {
      query = query.eq('userId', user.id)
    }

    const { data: surveys, error: surveyError } = await query

    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }

    const survey = surveys?.[0]
    // プランのAPI連携可否チェック（PROFESSIONAL/ENTERPRISE）
    const planType = 'FREE' // TODO: チケット制度移行のため一時的にFREE扱い
    const limits = getPlanLimits(planType)
    if (!limits.features.includes('api_integration')) {
      return NextResponse.json(
        { message: 'API access is available for Professional or Enterprise plans only' },
        { status: 403 }
      )
    }

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // 保存期間チェック（アンケートのendDate + retentionを過ぎていれば取得不可）
    if ((survey as any).endDate) {
      const userPlanType = (survey as any).user.userPlan?.planType || 'FREE'
      const limitsForRetention = getPlanLimits(userPlanType)
      if (limitsForRetention.dataRetentionDays) {
        const retentionDeadline = new Date(new Date((survey as any).endDate).getTime() + limitsForRetention.dataRetentionDays * 24 * 60 * 60 * 1000)
        if (new Date() > retentionDeadline) {
          return NextResponse.json(
            { message: 'Data retention period has expired for this survey' },
            { status: 403 }
          )
        }
      }
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
      .range(offset, offset + limit - 1)

    if (responsesError) {
      console.error('Error fetching responses:', responsesError)
      return NextResponse.json({ message: 'Failed to fetch responses' }, { status: 500 })
    }

    if (format === 'csv') {
      // CSV形式で出力
      const csvData = generateCSVData(survey, responses)
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="survey_${surveyId}_responses.csv"`,
        },
      })
    }

    // JSON形式で出力
    const responsesWithAnswers = responses.map((response: any) => {
      const answersMap: { [key: string]: string } = {}
      response.answers.forEach((answer: any) => {
        answersMap[answer.questionId] = answer.value || ''
      })

      return {
        id: response.id,
        createdAt: response.createdAt,
        answers: answersMap,
      }
    })

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
      },
      responses: responsesWithAnswers,
      pagination: {
        limit,
        offset,
        total: responses.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch responses:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const surveyId = (await params).id
    const { answers } = await request.json()

    if (!answers) {
      return NextResponse.json(
        { message: 'Answers are required' },
        { status: 400 }
      )
    }

    // アンケートが存在し、公開中かチェック (Supabase SDK使用)
    const { data: surveys, error: activeSurveyError } = await supabase
      .from('Survey')
      .select(`
        *,
        user:User(*)
      `)
      .eq('id', surveyId)
      .eq('status', 'ACTIVE')

    if (activeSurveyError) {
      console.error('Error fetching active survey:', activeSurveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }

    const survey = surveys?.[0]
    // プランのAPI連携可否チェック（PROFESSIONAL/ENTERPRISE）
    const planType = 'FREE' // TODO: チケット制度移行のため一時的にFREE扱い
    const limits = getPlanLimits(planType)
    if (!limits.features.includes('api_integration')) {
      return NextResponse.json(
        { message: 'API access is available for Professional or Enterprise plans only' },
        { status: 403 }
      )
    }

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found or not active' },
        { status: 404 }
      )
    }

    // 期限切れチェック（募集期間）
    if ((survey as any).endDate && new Date() > new Date((survey as any).endDate)) {
      return NextResponse.json(
        { message: 'This survey is closed for new responses' },
        { status: 403 }
      )
    }

    // 回答を作成 (Supabase SDK使用)
    const { data: response, error: responseError } = await supabase
      .from('Response')
      .insert({
        surveyId: surveyId,
      })
      .select()
      .single()

    if (responseError) {
      console.error('Error creating response:', responseError)
      return NextResponse.json({ message: 'Failed to create response' }, { status: 500 })
    }

    // 各質問の回答を作成
    const answerData = []
    for (const [questionId, value] of Object.entries(answers)) {
      if (value !== null && value !== undefined && value !== '') {
        let answerValue: string

        if (Array.isArray(value)) {
          // 複数選択の場合、カンマ区切りで保存
          answerValue = value.join(',')
        } else {
          answerValue = String(value)
        }

        answerData.push({
          questionId: questionId,
          responseId: response.id,
          value: answerValue,
        })
      }
    }

    // 回答データを一括作成
    if (answerData.length > 0) {
      const { error: answersError } = await supabase
        .from('Answer')
        .insert(answerData)

      if (answersError) {
        console.error('Error creating answers:', answersError)
        return NextResponse.json({ message: 'Failed to create answers' }, { status: 500 })
      }
    }

    return NextResponse.json({
      id: response.id,
      message: 'Response submitted successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to submit response:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateCSVData(survey: any, responses: any[]) {
  const questions = survey.questions
  const questionMap: { [key: string]: any } = {}

  // ヘッダー行を生成
  const headers = ['回答ID', '回答日時']
  questions.forEach((question: any) => {
    headers.push(question.title)
    questionMap[question.id] = question
  })

  // データ行を生成
  const rows: string[] = []
  rows.push(headers.join(','))

  responses.forEach((response: any) => {
    const rowData = [
      response.id,
      response.createdAt.toISOString(),
    ]

    questions.forEach((question: any) => {
      const answer = response.answers.find((a: any) => a.questionId === question.id)
      rowData.push(escapeCSVValue(answer?.value || ''))
    })

    rows.push(rowData.join(','))
  })

  return rows.join('\n')
}

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
