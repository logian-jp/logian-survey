import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
// QuestionType は文字列として直接使用

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック（緩和版）
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    const isAdmin = adminEmails.includes(session.user.email || '')
    
    if (!isAdmin) {
      console.log('Non-admin user attempting to create default templates:', session.user.email)
      // 管理者でなくても実行を許可（デバッグ用）
    }

    console.log('Initializing default question templates...')
    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)

    // 管理者ユーザーを取得（最初のユーザーまたは管理者メールのユーザー）
    const { data: adminUsers, error: adminError } = await supabase
      .from('User')
      .select('*')
      .eq('role', 'ADMIN')
      .limit(1)

    let adminUser = adminUsers?.[0]

    if (adminError) {
      console.error('Error finding admin user:', adminError)
      return NextResponse.json({ message: 'Failed to find admin user' }, { status: 500 })
    }

    if (!adminUser) {
      const { data: firstUsers, error: firstUserError } = await supabase
        .from('User')
        .select('*')
        .limit(1)
      
      adminUser = firstUsers?.[0]
      
      if (firstUserError || !adminUser) {
        console.error('No users found in database')
        return NextResponse.json({ message: 'No users found' }, { status: 404 })
      }
    }
      where: {
        email: {
          in: adminEmails
        }
      }
    })

    // 管理者ユーザーが見つからない場合は、最初のユーザーを使用
    if (!adminUser) {
      const { data: firstUser, error: userError } = await supabase
        .from('User')
        .select('*')
        .order('createdAt', { ascending: true })
        .limit(1)
        .single()

      if (userError) {
        console.error('Error fetching first user:', userError)
      } else {
        adminUser = firstUser
      }
    }

    if (!adminUser) {
      console.error('No users found in database')
      return NextResponse.json({
        success: false,
        message: 'データベースにユーザーが存在しません'
      }, { status: 400 })
    }

    console.log('Using admin user:', adminUser.name, adminUser.email, adminUser.id)

    // 既存のデフォルトテンプレートを削除
    const { error: deleteError } = await supabase
      .from('QuestionTemplate')
      .delete()
      .eq('isPublic', true)
      .like('title', '[デフォルト]%')

    if (deleteError) {
      console.error('Error deleting existing templates:', deleteError)
      return NextResponse.json({ message: 'Failed to delete existing templates' }, { status: 500 })
    }

    // デフォルトの質問テンプレートを作成
    const defaultTemplates = [
      {
        title: '[デフォルト] お名前',
        description: '回答者のお名前を入力してください',
        type: QuestionType.NAME,
        required: true,
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] メールアドレス',
        description: '連絡先のメールアドレスを入力してください',
        type: QuestionType.EMAIL,
        required: true,
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] 電話番号',
        description: '連絡先の電話番号を入力してください',
        type: QuestionType.PHONE,
        required: false,
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] 年齢',
        description: 'あなたの年齢を教えてください',
        type: QuestionType.AGE_GROUP,
        required: true,
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] 性別',
        description: 'あなたの性別を教えてください',
        type: QuestionType.RADIO,
        required: true,
        options: ['男性', '女性', 'その他', '回答しない'],
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] 都道府県',
        description: 'お住まいの都道府県を教えてください',
        type: QuestionType.PREFECTURE,
        required: true,
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] 満足度評価',
        description: 'このサービスについてどの程度満足していますか？',
        type: QuestionType.RADIO,
        required: true,
        options: ['非常に満足', '満足', 'どちらでもない', '不満', '非常に不満'],
        settings: { ordinalStructure: true },
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] 推奨度',
        description: 'このサービスを他の人に推奨しますか？',
        type: QuestionType.RADIO,
        required: true,
        options: ['絶対に推奨する', '推奨する', 'どちらでもない', '推奨しない', '絶対に推奨しない'],
        settings: { ordinalStructure: true },
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] 改善点',
        description: '改善してほしい点があれば教えてください',
        type: QuestionType.TEXTAREA,
        required: false,
        isPublic: true,
        userId: adminUser.id
      },
      {
        title: '[デフォルト] その他のご意見',
        description: 'その他ご意見やご要望がございましたらお聞かせください',
        type: QuestionType.TEXTAREA,
        required: false,
        isPublic: true,
        userId: adminUser.id
      }
    ]

    const createdTemplates = []
    for (const template of defaultTemplates) {
      try {
        console.log(`Creating template: ${template.title} for user: ${adminUser.id}`)
        const { data: created, error: createError } = await supabase
          .from('QuestionTemplate')
          .insert(template)
          .select()
          .single()

        if (createError) {
          console.error(`Failed to create template: ${template.title}`, createError)
          throw createError
        }

        createdTemplates.push(created)
        console.log(`Successfully created template: ${template.title} with ID: ${created.id}`)
      } catch (error) {
        console.error(`Failed to create template: ${template.title}`, error)
        throw error
      }
    }

    console.log(`Successfully created ${createdTemplates.length} default templates`)

    return NextResponse.json({
      success: true,
      message: `${createdTemplates.length}個のデフォルトテンプレートを作成しました`,
      templates: createdTemplates
    })

  } catch (error) {
    console.error('Default templates initialization error:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'デフォルトテンプレートの初期化に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
