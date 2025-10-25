import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

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
    const { type } = await request.json()

    // アンケートの所有者権限を確認 (Supabase SDK使用)
    const { data: surveys, error: surveyError } = await supabase
      .from('Survey')
      .select(`
        *,
        user:User(*)
      `)
      .eq('id', surveyId)

    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }

    const survey = surveys?.[0]

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    if (survey.userId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // TODO: チケット制度移行により、プランチェックを一時的に無効化
    // 画像削除機能は全ユーザーが利用可能
    /*
    const userPlan = await prisma.userPlan.findFirst({
      where: { userId: session.user.id }
    })

    if (userPlan?.planType !== 'ENTERPRISE') {
      return NextResponse.json({ message: 'Enterprise plan required' }, { status: 403 })
    }
    */

    // Base64データの場合はファイルシステムから削除する必要がない
    // データベースから直接削除するだけ

    // データベースを更新
    const updateData: any = {}
    if (type === 'header') {
      updateData.headerImageUrl = null
    } else if (type === 'og') {
      updateData.ogImageUrl = null
    }

    // データベースを更新 (Supabase SDK使用)
    const { error: updateError } = await supabase
      .from('Survey')
      .update(updateData)
      .eq('id', surveyId)

    if (updateError) {
      console.error('Error updating survey:', updateError)
      return NextResponse.json({ message: 'Failed to update survey' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Image removed successfully'
    })

  } catch (error) {
    console.error('Image removal error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
