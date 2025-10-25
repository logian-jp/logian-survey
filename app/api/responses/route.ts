import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkResponseLimit } from '@/lib/plan-check'
import { recordDataUsage } from '@/lib/plan-limits'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { surveyId, answers } = await request.json()

    console.log('Response submission request:', {
      surveyId,
      answers: Object.keys(answers || {}),
      answersCount: Object.keys(answers || {}).length
    })

    if (!surveyId || !answers) {
      return NextResponse.json(
        { message: 'Survey ID and answers are required' },
        { status: 400 }
      )
    }

    // アンケートが存在し、公開中かチェック (Supabase SDK使用)
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select(`
        *,
        questions:Question(*)
      `)
      .eq('id', surveyId)
      .eq('status', 'ACTIVE')
      .single()
    
    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Survey not found or not active' }, { status: 404 })
    }

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
    console.log('Checking response limit for survey:', surveyId)
    const limitCheck = await checkResponseLimit(surveyId)
    console.log('Response limit check result:', limitCheck)
    if (!limitCheck.allowed) {
      console.log('Response limit check failed:', limitCheck.message)
      return NextResponse.json(
        { message: limitCheck.message },
        { status: 403 }
      )
    }

    // 質問IDの存在確認
    const validQuestionIds = new Set(survey.questions.map((q: any) => q.id))
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

    // 回答と回答データを作成 (Supabase SDK使用)
    // まず回答を作成
    const { data: response, error: responseError } = await supabase
      .from('Response')
      .insert({
        surveyId: surveyId
      })
      .select()
      .single()

    if (responseError) {
      console.error('Failed to create response:', responseError)
      return NextResponse.json({ message: 'Failed to create response' }, { status: 500 })
    }

    // 各質問の回答データを準備
    const answerData = []
    
    for (const [questionId, value] of Object.entries(answers)) {
      if (value !== null && value !== undefined && value !== '') {
        // 質問の存在を再確認
        const question = survey.questions?.find((q: any) => q.id === questionId)
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

        answerData.push({
          questionId: questionId,
          responseId: response.id,
          value: answerValue,
        })
      }
    }
    
    // すべての回答を一括で作成
    if (answerData.length > 0) {
      const { error: answerError } = await supabase
        .from('Answer')
        .insert(answerData)

      if (answerError) {
        console.error('Failed to create answers:', answerError)
        // 回答作成に失敗した場合、作成済みのResponseを削除
        await supabase.from('Response').delete().eq('id', response.id)
        return NextResponse.json({ message: 'Failed to create answers' }, { status: 500 })
      }
    }

    // データ使用量を記録（回答送信時）
    const responseDataSize = JSON.stringify(answers).length
    await recordDataUsage(survey.userId, surveyId, 'survey_data', responseDataSize, `アンケート「${survey.title}」への回答`)

    return NextResponse.json({ message: 'Response submitted successfully' })
  } catch (error) {
    console.error('Failed to submit response:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
