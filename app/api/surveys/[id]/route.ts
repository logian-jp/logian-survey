import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewSurvey, canEditSurvey } from '@/lib/survey-permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id

    // 権限チェック
    const hasViewPermission = await canViewSurvey(session.user.id, surveyId)
    if (!hasViewPermission) {
      return NextResponse.json(
        { message: 'No permission to view this survey' },
        { status: 403 }
      )
    }

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
      maxResponses: survey.maxResponses,
      endDate: survey.endDate,
      targetResponses: survey.targetResponses,
      headerImageUrl: (survey as any).headerImageUrl,
      ogImageUrl: (survey as any).ogImageUrl,
      useCustomLogo: (survey as any).useCustomLogo,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id
    const { title, description, status, maxResponses, endDate, targetResponses, headerImageUrl, ogImageUrl, useCustomLogo } = await request.json()

    // 権限チェック
    const hasEditPermission = await canEditSurvey(session.user.id, surveyId)
    if (!hasEditPermission) {
      return NextResponse.json(
        { message: 'No permission to edit this survey' },
        { status: 403 }
      )
    }

    // アンケートの存在確認
    const existingSurvey = await prisma.survey.findUnique({
      where: { id: surveyId }
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
        maxResponses: maxResponses !== undefined ? maxResponses : null,
        endDate: endDate !== undefined ? endDate : null,
        targetResponses: targetResponses !== undefined ? targetResponses : null,
        headerImageUrl: headerImageUrl !== undefined ? headerImageUrl : null,
        ogImageUrl: ogImageUrl !== undefined ? ogImageUrl : null,
        useCustomLogo: useCustomLogo !== undefined ? useCustomLogo : null,
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
