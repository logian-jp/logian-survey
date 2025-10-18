import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('Fixing user ID mismatch...')
    
    // 現在のユーザーを取得
    const currentUser = await prisma.user.findUnique({
      where: { email: 'noutomi0729@gmail.com' }
    })
    
    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }
    
    console.log('Current user:', currentUser)
    
    // セッションのユーザーID
    const sessionUserId = 'cmgvyqjv70000tlq7oi97ukxe'
    
    // ユーザーIDを更新
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: { id: sessionUserId }
    })
    
    console.log('Updated user:', updatedUser)
    
    return NextResponse.json({
      success: true,
      message: 'User ID updated successfully',
      user: updatedUser
    })
  } catch (error) {
    console.error('Failed to fix user ID:', error)
    return NextResponse.json(
      { message: 'Failed to fix user ID', error: (error as Error).message },
      { status: 500 }
    )
  }
}
