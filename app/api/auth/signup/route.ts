import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // バリデーション
    if (!name || !email || !password) {
      return NextResponse.json(
        { 
          message: 'すべてのフィールドを入力してください',
          errors: {
            name: !name ? '名前は必須です' : undefined,
            email: !email ? 'メールアドレスは必須です' : undefined,
            password: !password ? 'パスワードは必須です' : undefined
          }
        },
        { status: 400 }
      )
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          message: '有効なメールアドレスを入力してください',
          errors: { email: 'メールアドレスの形式が正しくありません' }
        },
        { status: 400 }
      )
    }

    // パスワードの長さチェック
    if (password.length < 6) {
      return NextResponse.json(
        { 
          message: 'パスワードは6文字以上で入力してください',
          errors: { password: 'パスワードは6文字以上で入力してください' }
        },
        { status: 400 }
      )
    }

    // 既存ユーザーのチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          message: 'このメールアドレスは既に登録されています',
          errors: { email: 'このメールアドレスは既に登録されています' }
        },
        { status: 400 }
      )
    }

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12)

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })

    return NextResponse.json(
      { 
        message: 'アカウントが正常に作成されました',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    
    // より詳細なエラーメッセージ
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    } else {
      console.error('Unknown error:', error)
    }

    // データベース接続エラーの場合
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Database error code:', error.code)
    }

    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}
