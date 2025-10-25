import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

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

  // 実際の実装では、APIキーをデータベースで管理
  // ここでは環境変数で管理していると仮定
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

export async function GET(request: NextRequest) {
  try {
    // APIキーまたはユーザー認証をチェック
    const apiUser = await authenticateApiKey(request)
    const user = await authenticateUser(request)

    if (!apiUser && !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    const whereClause: any = {}
    
    // ユーザー認証の場合、自分のアンケートのみ
    if (user && !apiUser) {
      whereClause.userId = user.id
    }
    
    // ステータスフィルター
    if (status) {
      whereClause.status = status
    }

    // アンケート一覧を取得 (Supabase SDK使用)
    let query = supabase
      .from('Survey')
      .select('*')
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1)

    // ユーザー認証の場合、自分のアンケートのみ
    if (user && !apiUser) {
      query = query.eq('userId', user.id)
    }
    
    // ステータスフィルター
    if (status) {
      query = query.eq('status', status)
    }

    const { data: surveys, error: surveyError } = await query

    if (surveyError) {
      console.error('Failed to fetch surveys:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch surveys' }, { status: 500 })
    }

    // 各アンケートの質問数と回答数を別途取得
    const surveysWithCounts = await Promise.all(
      (surveys || []).map(async (survey) => {
        const [questionCount, responseCount] = await Promise.all([
          supabase.from('Question').select('*', { count: 'exact', head: true }).eq('surveyId', survey.id),
          supabase.from('Response').select('*', { count: 'exact', head: true }).eq('surveyId', survey.id)
        ])

        return {
          ...survey,
          _count: {
            questions: questionCount.count || 0,
            responses: responseCount.count || 0
          }
        }
      })
    )

    const formattedSurveys = surveysWithCounts.map(survey => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      shareUrl: survey.shareUrl,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
      questionCount: survey._count.questions,
      responseCount: survey._count.responses,
    }))

    return NextResponse.json({
      surveys: formattedSurveys,
      pagination: {
        limit,
        offset,
        total: formattedSurveys.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch surveys:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // APIキーまたはユーザー認証をチェック
    const apiUser = await authenticateApiKey(request)
    const user = await authenticateUser(request)

    if (!apiUser && !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, questions } = await request.json()

    if (!title) {
      return NextResponse.json(
        { message: 'Title is required' },
        { status: 400 }
      )
    }

    // ユーザーIDを決定
    const userId = user?.id || 'api-user' // APIユーザーの場合は仮のID

    // アンケート作成 (Supabase SDK使用)
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .insert({
        title,
        description: description || null,
        userId: userId,
      })
      .select()
      .single()

    if (surveyError) {
      console.error('Failed to create survey:', surveyError)
      return NextResponse.json({ message: 'Failed to create survey' }, { status: 500 })
    }

    // 質問を作成 (Supabase SDK使用)
    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        const { error: questionError } = await supabase
          .from('Question')
          .insert({
            surveyId: survey.id,
            type: question.type,
            title: question.title,
            description: question.description || null,
            required: question.required || false,
            order: i,
            options: question.options ? JSON.stringify(question.options) : null,
            settings: question.settings ? JSON.stringify(question.settings) : null,
          })

        if (questionError) {
          console.error('Failed to create question:', questionError)
          return NextResponse.json({ message: 'Failed to create question' }, { status: 500 })
        }
      }
    }

    return NextResponse.json(survey, { status: 201 })
  } catch (error) {
    console.error('Failed to create survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
