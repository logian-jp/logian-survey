import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id

    // アンケートの所有者を確認 (Supabase SDK使用)
    const { data: surveys, error: surveyError } = await supabase
      .from('Survey')
      .select('*')
      .eq('id', surveyId)
      .eq('userId', session.user.id)

    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }

    const survey = surveys?.[0]

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // 共有URLを生成（ランダムな文字列）
    const shareUrl = randomBytes(16).toString('hex')

    // アンケートを公開状態にして共有URLを設定 (Supabase SDK使用)
    const { data: updatedSurveys, error: updateError } = await supabase
      .from('Survey')
      .update({
        status: 'ACTIVE',
        shareUrl: shareUrl,
      })
      .eq('id', surveyId)
      .select()

    if (updateError) {
      console.error('Error updating survey:', updateError)
      return NextResponse.json({ message: 'Failed to update survey' }, { status: 500 })
    }

    const updatedSurvey = updatedSurveys?.[0]

    return NextResponse.json({
      shareUrl: shareUrl,
      publicUrl: `${process.env.NEXTAUTH_URL}/survey/${shareUrl}`,
    })
  } catch (error) {
    console.error('Failed to share survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id

    // アンケートの所有者を確認 (Supabase SDK使用)
    const { data: surveys, error: surveyError } = await supabase
      .from('Survey')
      .select('*')
      .eq('id', surveyId)
      .eq('userId', session.user.id)

    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }

    const survey = surveys?.[0]

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // アンケートを下書き状態にして共有URLを削除 (Supabase SDK使用)
    const { data: updatedSurveys, error: updateError } = await supabase
      .from('Survey')
      .update({
        status: 'DRAFT',
        shareUrl: null,
      })
      .eq('id', surveyId)
      .select()

    if (updateError) {
      console.error('Error updating survey:', updateError)
      return NextResponse.json({ message: 'Failed to unshare survey' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Survey unshared successfully' })
  } catch (error) {
    console.error('Failed to unshare survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
