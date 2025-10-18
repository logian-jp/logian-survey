import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 質問テンプレート一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includePublic = searchParams.get('includePublic') === 'true'

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

    const whereClause: any = {
      OR: [
        { userId: user.id }, // 自分のテンプレート
      ]
    }

    if (includePublic) {
      whereClause.OR.push({ isPublic: true }) // 公開テンプレート
    }

    const templates = await prisma.questionTemplate.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { isPublic: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    })

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

    console.log('Creating template for user:', user.name, user.email, user.id)

    const template = await prisma.questionTemplate.create({
      data: {
        title,
        description: description || null,
        type,
        required: required || false,
        options: options !== undefined ? options : undefined,
        settings: settings !== undefined ? settings : undefined,
        conditions: conditions !== undefined ? conditions : undefined,
        isPublic: isPublic || false,
        userId: user.id
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('質問テンプレート作成エラー:', error)
    return NextResponse.json(
      { message: '質問テンプレートの作成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
