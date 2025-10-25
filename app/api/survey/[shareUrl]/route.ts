import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareUrl: string }> }
) {
  try {
    const shareUrl = (await params).shareUrl

    const survey = await prisma.survey.findUnique({
      where: {
        shareUrl: shareUrl,
        status: 'ACTIVE',
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        user: {
          select: {
            customLogoUrl: true
          }
        }
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found or not active' },
        { status: 404 }
      )
    }

    // 募集期間の期限切れチェック（公開ページでもブロック）
    if ((survey as any).endDate && new Date() > new Date((survey as any).endDate)) {
      return NextResponse.json(
        { message: 'This survey is closed for new responses' },
        { status: 403 }
      )
    }

    // 質問のオプションをパース
    const questionsWithParsedOptions = survey.questions.map(question => ({
      ...question,
      options: question.options ? JSON.parse(question.options as string) : null,
      settings: question.settings ? JSON.parse(question.settings as string) : null,
    }))

    return NextResponse.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      headerImageUrl: (survey as any).headerImageUrl,
      ogImageUrl: (survey as any).ogImageUrl,
      useCustomLogo: (survey as any).useCustomLogo,
      customLogoUrl: survey.user.customLogoUrl,
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
