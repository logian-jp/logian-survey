import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 質問テンプレート一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includePublic = searchParams.get('includePublic') === 'true'

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
    let query = supabase
      .from('QuestionTemplate')
      .select(`
        *,
        user:User(id, name, email)
      `)
    
    // フィルター条件を構築
    if (includePublic) {
      query = query.or(`userId.eq.${user.id},isPublic.eq.true`)
    } else {
      query = query.eq('userId', user.id)
    }

    const { data: templates, error: templatesError } = await query
      .order('isPublic', { ascending: false })
      .order('usageCount', { ascending: false })
      .order('createdAt', { ascending: false })

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      return NextResponse.json({ message: '質問テンプレートの取得中にエラーが発生しました' }, { status: 500 })
    }

    return NextResponse.json(templates)
  } catch (error) {
    console.error('質問テンプレート取得エラー:', error)
    return NextResponse.json(
      { message: '質問テンプレートの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 質問テンプレート作成
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const { title, description, type, required, options, settings, conditions, isPublic } = await request.json()

    if (!title || !type) {
      return NextResponse.json({ message: 'タイトルとタイプは必須です' }, { status: 400 })
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

    console.log('Creating template for user:', user.name, user.email, user.id)

    // 質問テンプレートを作成 (Supabase SDK使用)
    const { data: template, error: templateError } = await supabase
      .from('QuestionTemplate')
      .insert({
        title,
        description: description || null,
        type,
        required: required || false,
        options: options !== undefined ? JSON.stringify(options) : null,
        settings: settings !== undefined ? JSON.stringify(settings) : null,
        conditions: conditions !== undefined ? JSON.stringify(conditions) : null,
        isPublic: isPublic || false,
        userId: user.id
      })
      .select()
      .single()

    if (templateError) {
      console.error('Failed to create template:', templateError)
      return NextResponse.json({ message: '質問テンプレートの作成中にエラーが発生しました' }, { status: 500 })
    }

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('質問テンプレート作成エラー:', error)
    return NextResponse.json(
      { message: '質問テンプレートの作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
