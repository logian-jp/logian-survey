import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 質問テンプレート詳細取得
export async function GET(
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

    // 質問テンプレートを取得 (Supabase SDK使用)
    const { data: template, error: templateError } = await supabase
      .from('QuestionTemplate')
      .select(`
        *,
        user:User(id, name, email)
      `)
      .eq('id', (await params).id)
      .or(`userId.eq.${user.id},isPublic.eq.true`)
      .single()

    if (templateError || !template) {
      console.error('Template not found:', templateError)
      return NextResponse.json({ message: '質問テンプレートが見つかりません' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('質問テンプレート取得エラー:', error)
    return NextResponse.json(
      { message: '質問テンプレートの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 質問テンプレート更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const { title, description, type, required, options, settings, conditions, isPublic } = await request.json()

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

    // テンプレートの所有者かチェック (Supabase SDK使用)
    const { data: existingTemplate, error: templateError } = await supabase
      .from('QuestionTemplate')
      .select('*')
      .eq('id', (await params).id)
      .eq('userId', user.id)
      .single()

    if (templateError || !existingTemplate) {
      console.error('Template not found or access denied:', templateError)
      return NextResponse.json({ message: 'このテンプレートを編集する権限がありません' }, { status: 403 })
    }

    // テンプレートを更新 (Supabase SDK使用)
    const { data: template, error: updateError } = await supabase
      .from('QuestionTemplate')
      .update({
        title,
        description: description || null,
        type,
        required: required || false,
        options: options !== undefined ? JSON.stringify(options) : undefined,
        settings: settings !== undefined ? JSON.stringify(settings) : undefined,
        conditions: conditions !== undefined ? JSON.stringify(conditions) : undefined,
        isPublic: isPublic || false
      })
      .eq('id', (await params).id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update template:', updateError)
      return NextResponse.json({ message: 'テンプレートの更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('質問テンプレート更新エラー:', error)
    return NextResponse.json(
      { message: '質問テンプレートの更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 質問テンプレート削除
export async function DELETE(
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

    // テンプレートの所有者かチェック (Supabase SDK使用)
    const { data: existingTemplate, error: templateError } = await supabase
      .from('QuestionTemplate')
      .select('*')
      .eq('id', (await params).id)
      .eq('userId', user.id)
      .single()

    if (templateError || !existingTemplate) {
      console.error('Template not found or access denied:', templateError)
      return NextResponse.json({ message: 'このテンプレートを削除する権限がありません' }, { status: 403 })
    }

    // テンプレートを削除 (Supabase SDK使用)
    const { error: deleteError } = await supabase
      .from('QuestionTemplate')
      .delete()
      .eq('id', (await params).id)

    if (deleteError) {
      console.error('Failed to delete template:', deleteError)
      return NextResponse.json({ message: 'テンプレートの削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ message: '質問テンプレートが削除されました' })
  } catch (error) {
    console.error('質問テンプレート削除エラー:', error)
    return NextResponse.json(
      { message: '質問テンプレートの削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
