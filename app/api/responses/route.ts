import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { surveyId, answers } = await request.json()

    if (!surveyId || !answers) {
      return NextResponse.json(
        { message: 'Survey ID and answers are required' },
        { status: 400 }
      )
    }

    // アンケートが存在し、公開中かチェック
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        status: 'ACTIVE',
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found or not active' },
        { status: 404 }
      )
    }

    // 回答を作成
    const response = await prisma.response.create({
      data: {
        surveyId: surveyId,
      },
    })

    // 各質問の回答を作成
    for (const [questionId, value] of Object.entries(answers)) {
      if (value !== null && value !== undefined && value !== '') {
        let answerValue: string

        if (Array.isArray(value)) {
          // 複数選択の場合、カンマ区切りで保存
          answerValue = value.join(',')
        } else {
          answerValue = String(value)
        }

        await prisma.answer.create({
          data: {
            questionId: questionId,
            responseId: response.id,
            value: answerValue,
          },
        })
      }
    }

    return NextResponse.json({ message: 'Response submitted successfully' })
  } catch (error) {
    console.error('Failed to submit response:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
