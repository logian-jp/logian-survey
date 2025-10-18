import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkSurveyLimit } from '@/lib/plan-check'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveys = await prisma.survey.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          {
            surveyUsers: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      include: {
        _count: {
          select: {
            responses: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        surveyUsers: {
          where: {
            userId: session.user.id
          },
          select: {
            permission: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const surveysWithResponseCount = surveys.map(survey => {
      const isOwner = survey.userId === session.user.id
      const userPermission = survey.surveyUsers[0]?.permission

      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        shareUrl: survey.shareUrl,
        createdAt: survey.createdAt,
        responseCount: survey._count.responses,
        maxResponses: survey.maxResponses,
        endDate: survey.endDate,
        targetResponses: survey.targetResponses,
        owner: survey.user,
        userPermission: isOwner ? 'OWNER' : userPermission || 'VIEW',
      }
    })

    return NextResponse.json(surveysWithResponseCount)
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
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    console.log('Creating survey for user:', session.user.id)
    console.log('Session user:', session.user)

    // プラン制限チェック
    const limitCheck = await checkSurveyLimit(session.user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { message: limitCheck.message },
        { status: 403 }
      )
    }

    // ユーザーの存在確認
    let user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      console.log('User not found, creating new user...')
      // ユーザーが存在しない場合は作成
      user = await prisma.user.create({
        data: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }
      })
      console.log('User created:', user)
    } else {
      console.log('User found:', user)
    }

    const { title, description, maxResponses, endDate, targetResponses } = await request.json()

    if (!title) {
      return NextResponse.json(
        { message: 'Title is required' },
        { status: 400 }
      )
    }

    // アンケート作成と作成者の管理者権限付与をトランザクションで実行
    const result = await prisma.$transaction(async (tx) => {
      // アンケートを作成
      const survey = await tx.survey.create({
        data: {
          title,
          description: description || null,
          maxResponses: maxResponses || null,
          endDate: endDate || null,
          targetResponses: targetResponses || null,
          userId: session.user.id,
        },
      })

      // 作成者を管理者権限でSurveyUserテーブルに追加
      await tx.surveyUser.create({
        data: {
          userId: session.user.id,
          surveyId: survey.id,
          permission: 'ADMIN',
          invitedBy: session.user.id, // 自分自身を招待者として設定
          acceptedAt: new Date(), // 即座に承認済みとして設定
        },
      })

      return survey
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to create survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
