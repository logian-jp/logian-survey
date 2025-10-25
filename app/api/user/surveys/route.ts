import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: surveys, error: surveysError } = await supabase
      .from('Survey')
      .select('*')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })

    if (surveysError) {
      console.error('Error fetching surveys:', surveysError)
      return NextResponse.json({ message: 'Failed to fetch surveys' }, { status: 500 })
    }

    // レスポンス形式を元のコードに合わせて調整
    const formattedSurveys = (surveys || []).map(survey => ({
      id: survey.id,
      title: survey.title,
      status: survey.status,
      createdAt: survey.createdAt
    }))

    return NextResponse.json(formattedSurveys)
  } catch (error) {
    console.error('Error fetching user surveys:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
