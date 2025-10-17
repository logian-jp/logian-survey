import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('Signup request received')
    
    const { name, email, password } = await request.json()
    console.log('Signup data:', { name, email, password: password ? '***' : 'undefined' })

    // バリデーション
    if (!name || !email || !password) {
      console.log('Validation failed: missing fields')
      return NextResponse.json(
        { message: 'すべてのフィールドを入力してください' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      console.log('Validation failed: password too short')
      return NextResponse.json(
        { message: 'パスワードは6文字以上で入力してください' },
        { status: 400 }
      )
    }

    // メールアドレスの重複チェック
    console.log('Checking for existing user...')
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('User already exists')
      return NextResponse.json(
        { message: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      )
    }

    // パスワードのハッシュ化
    console.log('Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)

    // ユーザー作成
    console.log('Creating user...')
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
      }
    })

    console.log('User created successfully:', user.id)
    return NextResponse.json(
      { message: 'アカウントが作成されました' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    
    // より詳細なエラーメッセージ
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    // データベース接続エラーの場合
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Database error code:', error.code)
    }

    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
