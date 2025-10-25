import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 質問テンプレートの使用回数を増加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    // メールアドレスでユーザーを検索 (Supabase SDK使用)
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', session.user.email!)
      .single()

    if (userError || !user) {
      console.error('User not found in database:', session.user.email, userError)
      return NextResponse.json({
        message: 'ユーザーがデータベースに存在しません',
        email: session.user.email
      }, { status: 400 })
    }

    // テンプレートが存在し、アクセス可能かチェック (Supabase SDK使用)
    const { data: template, error: templateError } = await supabase
      .from('QuestionTemplate')
      .select('*')
      .eq('id', (await params).id)
      .or(`userId.eq.${user.id},isPublic.eq.true`)
      .single()

    if (templateError || !template) {
      console.error('Template not found:', templateError)
      return NextResponse.json({ message: '質問テンプレートが見つかりません' }, { status: 404 })
    }

    // 使用回数を増加 (Supabase SDK使用 - 現在の値を取得してから更新)
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('QuestionTemplate')
      .update({
        usageCount: (template.usageCount || 0) + 1
      })
      .eq('id', (await params).id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update usage count:', updateError)
      return NextResponse.json({ message: '使用回数の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('質問テンプレート使用回数更新エラー:', error)
    return NextResponse.json(
      { message: '使用回数の更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
