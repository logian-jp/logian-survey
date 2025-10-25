import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { canViewSurvey, canEditSurvey } from '@/lib/survey-permissions'
import { getTicketLimits } from '@/lib/ticket-check'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id

    // 権限チェック
    const hasViewPermission = await canViewSurvey(session.user.id, surveyId)
    if (!hasViewPermission) {
      return NextResponse.json(
        { message: 'No permission to view this survey' },
        { status: 403 }
      )
    }

    // Supabase SDKを使用してアンケート情報を取得
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select(`
        *,
        questions:Question(*)
      `)
      .eq('id', surveyId)
      .single()

    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }
    
    // レスポンス数を取得
    let responseCount = 0
    if (survey) {
      const { count, error: countError } = await supabase
        .from('Response')
        .select('*', { count: 'exact', head: true })
        .eq('surveyId', surveyId)
      
      if (!countError) {
        responseCount = count || 0
      }
    }

    // questionsの順序でソート
    if (survey?.questions) {
      survey.questions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    }

    // _countフィールドを追加（Prismaと同じ形式にするため）
    if (survey) {
      survey._count = { responses: responseCount }
    }

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // 質問のオプションをパース
    const questionsWithParsedOptions = survey.questions.map((question: {id: string, type: string, title: string, description?: string, options?: string, settings?: string, order?: number, required?: boolean}) => ({
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
      // チケット情報
      ticketType: survey.ticketType,
      ticketId: (survey as any).ticketId,
      paymentId: (survey as any).paymentId,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id
    const { title, description, status, maxResponses, endDate, targetResponses, headerImageUrl, ogImageUrl, useCustomLogo } = await request.json()

    // 権限チェック
    const hasEditPermission = await canEditSurvey(session.user.id, surveyId)
    if (!hasEditPermission) {
      return NextResponse.json(
        { message: 'No permission to edit this survey' },
        { status: 403 }
      )
    }

    // アンケートの存在確認 (Supabase SDK使用)
    const { data: existingSurveys, error: existingError } = await supabase
      .from('Survey')
      .select('*')
      .eq('id', surveyId)

    if (existingError) {
      console.error('Error checking survey existence:', existingError)
      return NextResponse.json({ message: 'Failed to check survey' }, { status: 500 })
    }

    const existingSurvey = existingSurveys?.[0]

    if (!existingSurvey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // 無料チケットの制限チェック
    const surveyTicketType = existingSurvey.ticketType || 'FREE'
    
    // 無料チケットの回答上限制限
    let finalMaxResponses = maxResponses
    if (surveyTicketType === 'FREE' && maxResponses !== undefined) {
      const limits = getTicketLimits('FREE')
      if (limits.maxResponsesPerSurvey !== -1) {
        finalMaxResponses = Math.min(maxResponses, limits.maxResponsesPerSurvey)
      }
    }

    // 無料チケットのYouTube埋め込み禁止（iframe除去）
    let sanitizedDescription = description
    try {
      const { canUseVideoEmbedding } = await import('@/lib/ticket-check')
      const canEmbed = canUseVideoEmbedding(surveyTicketType)
      if (!canEmbed && typeof sanitizedDescription === 'string' && sanitizedDescription.includes('<iframe')) {
        sanitizedDescription = sanitizedDescription.replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      }
    } catch (e) {
      // 失敗時はそのまま
    }

    // アンケートを更新 (Supabase SDK使用)
    const updateData: any = {}
    if (title) updateData.title = title
    if (description !== undefined) updateData.description = sanitizedDescription
    if (status) updateData.status = status
    if (finalMaxResponses !== undefined) updateData.maxResponses = finalMaxResponses
    if (endDate !== undefined) updateData.endDate = endDate
    if (targetResponses !== undefined) updateData.targetResponses = targetResponses
    if (headerImageUrl !== undefined) updateData.headerImageUrl = headerImageUrl
    if (ogImageUrl !== undefined) updateData.ogImageUrl = ogImageUrl
    if (useCustomLogo !== undefined) updateData.useCustomLogo = useCustomLogo

    const { data: updatedSurveys, error: updateError } = await supabase
      .from('Survey')
      .update(updateData)
      .eq('id', surveyId)
      .select()

    if (updateError) {
      console.error('Error updating survey:', updateError)
      return NextResponse.json({ message: 'Failed to update survey' }, { status: 500 })
    }

    const updatedSurvey = updatedSurveys?.[0]

    return NextResponse.json(updatedSurvey)
  } catch (error) {
    console.error('Failed to update survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
