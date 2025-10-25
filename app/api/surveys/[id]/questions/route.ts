import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // アンケートの存在確認と権限チェック (Supabase SDK使用)
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

    // アンケートに関連するすべての質問を削除 (Supabase SDK使用)
    const { error: deleteError } = await supabase
      .from('Question')
      .delete()
      .eq('surveyId', surveyId)

    if (deleteError) {
      console.error('Error deleting questions:', deleteError)
      return NextResponse.json({ message: 'Failed to delete questions' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Questions deleted successfully' })
  } catch (error) {
    console.error('Failed to delete questions:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
