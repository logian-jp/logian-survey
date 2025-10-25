import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    // テンプレートが存在し、アクセス可能かチェック
    const template = await prisma.questionTemplate.findFirst({
      where: {
        id: (await params).id,
        OR: [
          { userId: user.id },
          { isPublic: true }
        ]
      }
    })

    if (!template) {
      return NextResponse.json({ message: '質問テンプレートが見つかりません' }, { status: 404 })
    }

    // 使用回数を増加
    const updatedTemplate = await prisma.questionTemplate.update({
      where: { id: (await params).id },
      data: {
        usageCount: {
          increment: 1
        }
      }
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('質問テンプレート使用回数更新エラー:', error)
    return NextResponse.json(
      { message: '使用回数の更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
