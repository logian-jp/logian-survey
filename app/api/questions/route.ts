import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const {
      surveyId,
      type,
      title,
      description,
      required,
      options,
      settings,
      order,
    } = await request.json()

    console.log('Question creation request:', {
      surveyId,
      type,
      title,
      description,
      required,
      options,
      settings,
      order,
    })

    if (!surveyId || !type) {
      return NextResponse.json(
        { message: 'Survey ID and type are required' },
        { status: 400 }
      )
    }

    // PAGE_BREAKとSECTION以外はtitleが必須
    if (type !== 'PAGE_BREAK' && type !== 'SECTION' && !title) {
      return NextResponse.json(
        { message: 'Title is required for this question type' },
        { status: 400 }
      )
    }

    // アンケートの所有者を確認
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        userId: session.user.id,
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    const question = await prisma.question.create({
      data: {
        surveyId,
        type,
        title: title || (type === 'PAGE_BREAK' ? '改ページ' : type === 'SECTION' ? 'セクション' : ''),
        description: description || null,
        required: required || false,
        order: order || 0,
        options: options ? JSON.stringify(options) : undefined,
        settings: settings ? JSON.stringify(settings) : undefined,
      },
    })

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    console.error('Failed to create question:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
