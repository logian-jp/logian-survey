import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('Creating test user...')
    
    // 既存のユーザーを削除 (Supabase SDK使用)
    await supabase
      .from('User')
      .delete()
      .eq('email', 'noutomi0729@gmail.com')
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    // 新しいユーザーを作成 (Supabase SDK使用)
    const { data: user, error } = await supabase
      .from('User')
      .insert({
        name: 'Takashi Notomi',
        email: 'noutomi0729@gmail.com',
        password: hashedPassword,
        role: 'USER'
      })
      .select()
      .single()

    if (error) {
      throw error
    }
    
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