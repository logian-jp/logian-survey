import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('Resetting password for noutomi0729@gmail.com...')
    
    // 新しいパスワードをハッシュ化
    const newPassword = 'password123'
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    console.log('Hashed password:', hashedPassword)
    
    // ユーザーのパスワードを更新
    const updatedUser = await prisma.user.update({
      where: {
        email: 'noutomi0729@gmail.com'
      },
      data: {
        password: hashedPassword
      }
    })
    
    console.log('Password updated successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name
      }
    })
  } catch (error) {
    console.error('Failed to reset password:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to reset password',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
