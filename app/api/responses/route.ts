import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkResponseLimit } from '@/lib/plan-check'
import { recordDataUsage } from '@/lib/plan-limits'

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
      include: {
        questions: true,
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found or not active' },
        { status: 404 }
      )
    }

    // 期限切れチェック
    if (survey.endDate && new Date() > new Date(survey.endDate)) {
      return NextResponse.json(
        { message: 'This survey is closed for new responses' },
        { status: 403 }
      )
    }

    // プラン制限チェック
    const limitCheck = await checkResponseLimit(surveyId)
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { message: limitCheck.message },
        { status: 403 }
      )
    }

    // 質問IDの存在確認
    const validQuestionIds = new Set(survey.questions.map(q => q.id))
    const submittedQuestionIds = Object.keys(answers)
    
    for (const questionId of submittedQuestionIds) {
      if (!validQuestionIds.has(questionId)) {
        console.error(`Invalid questionId: ${questionId} for survey: ${surveyId}`)
        return NextResponse.json(
          { message: `Invalid question ID: ${questionId}` },
          { status: 400 }
        )
      }
    }

    // 回答を作成
    const response = await prisma.response.create({
      data: {
        surveyId: surveyId,
      },
    })

    // 各質問の回答を作成（トランザクション内で実行）
    const answerPromises = []
    
    for (const [questionId, value] of Object.entries(answers)) {
      if (value !== null && value !== undefined && value !== '') {
        // 質問の存在を再確認
        const question = survey.questions.find(q => q.id === questionId)
        if (!question) {
          console.error(`Question not found: ${questionId}`)
          continue
        }
        
        let answerValue: string

        if (Array.isArray(value)) {
          // 複数選択の場合、カンマ区切りで保存
          answerValue = value.join(',')
        } else {
          answerValue = String(value)
        }

        answerPromises.push(
          prisma.answer.create({
            data: {
              questionId: questionId,
              responseId: response.id,
              value: answerValue,
            },
          })
        )
      }
    }
    
    // すべての回答を並行して作成
    await Promise.all(answerPromises)

    // データ使用量を記録（回答送信時）
    const responseDataSize = JSON.stringify(answers).length
    await recordDataUsage(survey.userId, surveyId, 'survey_data', responseDataSize, `アンケート「${survey.title}」への回答`)

    return NextResponse.json({ message: 'Response submitted successfully' })
  } catch (error) {
    console.error('Failed to submit response:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
