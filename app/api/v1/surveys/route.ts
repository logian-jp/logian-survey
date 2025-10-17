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

    const surveys = await prisma.survey.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            questions: true,
            responses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    const surveysWithCounts = surveys.map(survey => ({
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
      surveys: surveysWithCounts,
      pagination: {
        limit,
        offset,
        total: surveys.length,
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

    // アンケート作成
    const survey = await prisma.survey.create({
      data: {
        title,
        description: description || null,
        userId: userId,
      },
    })

    // 質問を作成
    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        await prisma.question.create({
          data: {
            surveyId: survey.id,
            type: question.type,
            title: question.title,
            description: question.description || null,
            required: question.required || false,
            order: i,
            options: question.options ? JSON.stringify(question.options) : null,
            settings: question.settings ? JSON.stringify(question.settings) : null,
          },
        })
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
