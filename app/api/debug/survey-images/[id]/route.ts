import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // アンケート情報を取得 (Supabase SDK使用)
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select('id, title, ogImageUrl, headerImageUrl, useCustomLogo')
      .eq('id', (await params).id)
      .single()

    if (surveyError || !survey) {
      console.error('Survey not found:', surveyError)
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        ogImageUrl: survey.ogImageUrl,
        headerImageUrl: survey.headerImageUrl,
        useCustomLogo: survey.useCustomLogo,
        ogImageUrlType: survey.ogImageUrl ? (survey.ogImageUrl.startsWith('data:') ? 'base64' : 'url') : 'null',
        headerImageUrlType: survey.headerImageUrl ? (survey.headerImageUrl.startsWith('data:') ? 'base64' : 'url') : 'null'
      }
    })
  } catch (error) {
    console.error('Debug survey images error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
