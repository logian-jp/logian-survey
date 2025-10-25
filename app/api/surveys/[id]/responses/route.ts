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
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        OR: [
          { userId: session.user.id },
          {
            surveyUsers: {
              some: {
                userId: session.user.id,
                permission: { in: ['EDIT', 'ADMIN', 'VIEW'] }
              }
            }
          }
        ]
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

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
