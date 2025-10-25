import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareUrl: string }> }
) {
  try {
    const shareUrl = (await params).shareUrl

    // アンケートを取得 (Supabase SDK使用)
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select(`
        *,
        questions:Question(*),
        user:User(customLogoUrl)
      `)
      .eq('shareUrl', shareUrl)
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

    // 募集期間の期限切れチェック（公開ページでもブロック）
    if ((survey as any).endDate && new Date() > new Date((survey as any).endDate)) {
      return NextResponse.json(
        { message: 'This survey is closed for new responses' },
        { status: 403 }
      )
    }

    // Supabaseでは質問の順序を手動でソート
    if (survey.questions) {
      survey.questions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    }

    // 質問のオプションをパース
    const questionsWithParsedOptions = (survey.questions || []).map(question => ({
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
