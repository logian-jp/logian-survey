import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
        error: error.message 
      },
      { status: 500 }
    )
  }
}
