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

    // アンケートを取得 (Supabase SDK使用)
    let surveyQuery = supabase
      .from('Survey')
      .select('*, questions:Question(*)')
      .eq('id', surveyId)

    // ユーザー認証の場合、自分のアンケートのみ
    if (user && !apiUser) {
      surveyQuery = surveyQuery.eq('userId', user.id)
    }

    const { data: survey, error: surveyError } = await surveyQuery.single()

    if (surveyError || !survey) {
      console.error('Survey not found:', surveyError)
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    // 回答数を別途取得
    const { count: responseCount } = await supabase
      .from('Response')
      .select('*', { count: 'exact', head: true })
      .eq('surveyId', surveyId)

    // 質問をソート
    const sortedQuestions = (survey.questions || []).sort((a: any, b: any) => a.order - b.order)

    // 質問のオプションをパース
    const questionsWithParsedOptions = sortedQuestions.map((question: any) => ({
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
      status: survey.status,
      shareUrl: survey.shareUrl,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
      responseCount: responseCount || 0,
      questions: questionsWithParsedOptions,
    })
  } catch (error) {
    console.error('Failed to fetch survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { title, description, status } = await request.json()

    // アンケートの存在確認と権限チェック (Supabase SDK使用)
    let checkQuery = supabase
      .from('Survey')
      .select('*')
      .eq('id', surveyId)

    // ユーザー認証の場合、自分のアンケートのみ
    if (user && !apiUser) {
      checkQuery = checkQuery.eq('userId', user.id)
    }

    const { data: existingSurvey, error: checkError } = await checkQuery.single()

    if (checkError || !existingSurvey) {
      console.error('Survey not found for update:', checkError)
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // アンケートを更新 (Supabase SDK使用)
    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status) updateData.status = status

    const { data: updatedSurvey, error: updateError } = await supabase
      .from('Survey')
      .update(updateData)
      .eq('id', surveyId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update survey:', updateError)
      return NextResponse.json({ message: 'Failed to update survey' }, { status: 500 })
    }

    return NextResponse.json(updatedSurvey)
  } catch (error) {
    console.error('Failed to update survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // アンケートの存在確認と権限チェック (Supabase SDK使用)
    let deleteCheckQuery = supabase
      .from('Survey')
      .select('*')
      .eq('id', surveyId)

    // ユーザー認証の場合、自分のアンケートのみ
    if (user && !apiUser) {
      deleteCheckQuery = deleteCheckQuery.eq('userId', user.id)
    }

    const { data: existingSurvey, error: checkError } = await deleteCheckQuery.single()

    if (checkError || !existingSurvey) {
      console.error('Survey not found for deletion:', checkError)
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // アンケートを削除 (Supabase SDK使用)
    const { error: deleteError } = await supabase
      .from('Survey')
      .delete()
      .eq('id', surveyId)

    if (deleteError) {
      console.error('Failed to delete survey:', deleteError)
      return NextResponse.json({ message: 'Failed to delete survey' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Survey deleted successfully' })
  } catch (error) {
    console.error('Failed to delete survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
