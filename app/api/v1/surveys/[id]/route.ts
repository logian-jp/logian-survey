import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        // ユーザー認証の場合、自分のアンケートのみ
        ...(user && !apiUser ? { userId: user.id } : {}),
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            responses: true,
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

    // 質問のオプションをパース
    const questionsWithParsedOptions = survey.questions.map(question => ({
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
      responseCount: survey._count.responses,
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

    // アンケートの存在確認と権限チェック
    const existingSurvey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        // ユーザー認証の場合、自分のアンケートのみ
        ...(user && !apiUser ? { userId: user.id } : {}),
      },
    })

    if (!existingSurvey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // アンケートを更新
    const updatedSurvey = await prisma.survey.update({
      where: { id: surveyId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
    })

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

    // アンケートの存在確認と権限チェック
    const existingSurvey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        // ユーザー認証の場合、自分のアンケートのみ
        ...(user && !apiUser ? { userId: user.id } : {}),
      },
    })

    if (!existingSurvey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // アンケートを削除（関連する質問と回答も自動削除）
    await prisma.survey.delete({
      where: { id: surveyId },
    })

    return NextResponse.json({ message: 'Survey deleted successfully' })
  } catch (error) {
    console.error('Failed to delete survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
