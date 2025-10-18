import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('Creating test user...')
    
    // 既存のユーザーを削除
    await prisma.user.deleteMany({
      where: {
        email: 'noutomi0729@gmail.com'
      }
    })
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    // 新しいユーザーを作成
    const user = await prisma.user.create({
      data: {
        name: 'Takashi Notomi',
        email: 'noutomi0729@gmail.com',
        password: hashedPassword,
        role: 'USER'
      }
    })
    
    console.log('Created user:', user)
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json(
      { message: 'Failed to create user', error: (error as Error).message },
      { status: 500 }
    )
  }
}