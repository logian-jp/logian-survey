import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { userId, newRole, password } = await request.json()

    if (!userId || !newRole || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    if (!['ADMIN', 'USER'].includes(newRole)) {
      return NextResponse.json({ message: 'Invalid role' }, { status: 400 })
    }

    // 現在の管理者のパスワードを確認
    const currentAdmin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    })

    if (!currentAdmin?.password) {
      return NextResponse.json({ message: 'Admin password not found' }, { status: 400 })
    }

    // パスワードを検証
    const isPasswordValid = await bcrypt.compare(password, currentAdmin.password)
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid password' }, { status: 401 })
    }

    // 変更対象のユーザーを取得
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // 自分自身のロールは変更できない
    if (targetUser.id === session.user.id) {
      return NextResponse.json({ message: 'Cannot change your own role' }, { status: 400 })
    }

    // ロールを変更
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    })

    console.log(`Role changed for user ${targetUser.email}: ${targetUser.role} -> ${newRole} by admin ${session.user.email}`)

    return NextResponse.json({ 
      message: 'Role changed successfully',
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: newRole
      }
    })
  } catch (error) {
    console.error('Failed to change user role:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
