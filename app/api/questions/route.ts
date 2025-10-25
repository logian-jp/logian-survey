import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // アンケートの所有者を確認 (Supabase SDK使用)
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select('*')
      .eq('id', surveyId)
      .eq('userId', session.user.id)
      .single()

    if (surveyError || !survey) {
      console.error('Survey not found or access denied:', surveyError)
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // 質問を作成 (Supabase SDK使用)
    const { data: question, error: questionError } = await supabase
      .from('Question')
      .insert({
        surveyId,
        type,
        title: title || (type === 'PAGE_BREAK' ? '改ページ' : type === 'SECTION' ? 'セクション' : ''),
        description: description || null,
        required: required || false,
        order: order || 0,
        options: options ? JSON.stringify(options) : null,
        settings: settings ? JSON.stringify(settings) : null,
      })
      .select()
      .single()

    if (questionError) {
      console.error('Failed to create question:', questionError)
      return NextResponse.json({ message: 'Failed to create question' }, { status: 500 })
    }

    return NextResponse.json(question, { status: 201 })
  } catch (error) {
    console.error('Failed to create question:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
