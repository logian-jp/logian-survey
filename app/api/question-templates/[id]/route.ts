import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 質問テンプレート詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      console.error('User not found in database:', session.user.email)
      return NextResponse.json({
        message: 'ユーザーがデータベースに存在しません',
        email: session.user.email
      }, { status: 400 })
    }

    const template = await prisma.questionTemplate.findFirst({
      where: {
        id: params.id,
        OR: [
          { userId: user.id },
          { isPublic: true }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!template) {
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const { title, description, type, required, options, settings, conditions, isPublic } = await request.json()

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      console.error('User not found in database:', session.user.email)
      return NextResponse.json({
        message: 'ユーザーがデータベースに存在しません',
        email: session.user.email
      }, { status: 400 })
    }

    // テンプレートの所有者かチェック
    const existingTemplate = await prisma.questionTemplate.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingTemplate) {
      return NextResponse.json({ message: 'このテンプレートを編集する権限がありません' }, { status: 403 })
    }

    const template = await prisma.questionTemplate.update({
      where: { id: params.id },
      data: {
        title,
        description: description || null,
        type,
        required: required || false,
        options: options !== undefined ? options : undefined,
        settings: settings !== undefined ? settings : undefined,
        conditions: conditions !== undefined ? conditions : undefined,
        isPublic: isPublic || false
      }
    })

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      console.error('User not found in database:', session.user.email)
      return NextResponse.json({
        message: 'ユーザーがデータベースに存在しません',
        email: session.user.email
      }, { status: 400 })
    }

    // テンプレートの所有者かチェック
    const existingTemplate = await prisma.questionTemplate.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingTemplate) {
      return NextResponse.json({ message: 'このテンプレートを削除する権限がありません' }, { status: 403 })
    }

    await prisma.questionTemplate.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: '質問テンプレートが削除されました' })
  } catch (error) {
    console.error('質問テンプレート削除エラー:', error)
    return NextResponse.json(
      { message: '質問テンプレートの削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
