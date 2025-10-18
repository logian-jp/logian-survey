import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { QuestionType } from '@prisma/client'

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
    let adminUser = await prisma.user.findFirst({
      where: {
        email: {
          in: adminEmails
        }
      }
    })

    // 管理者ユーザーが見つからない場合は、最初のユーザーを使用
    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' }
      })
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
    await prisma.questionTemplate.deleteMany({
      where: {
        isPublic: true,
        title: {
          startsWith: '[デフォルト]'
        }
      }
    })

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
        const created = await prisma.questionTemplate.create({
          data: template
        })
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
