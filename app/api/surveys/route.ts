import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const { title, description } = await request.json()

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
