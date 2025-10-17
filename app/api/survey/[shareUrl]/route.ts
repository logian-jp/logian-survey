import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { shareUrl: string } }
) {
  try {
    const shareUrl = params.shareUrl

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
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found or not active' },
        { status: 404 }
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
