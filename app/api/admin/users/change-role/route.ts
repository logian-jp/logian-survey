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
    const { data: currentAdmin, error: adminError } = await supabase
      .from('User')
      .select('password')
      .eq('id', session.user.id)
      .single()

    if (adminError || !currentAdmin?.password) {
      return NextResponse.json({ message: 'Admin password not found' }, { status: 400 })
    }

    // パスワードを検証
    const isPasswordValid = await bcrypt.compare(password, currentAdmin.password)
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid password' }, { status: 401 })
    }

    // 変更対象のユーザーを取得
    const { data: targetUser, error: userError } = await supabase
      .from('User')
      .select('id, name, email, role')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // 自分自身のロールは変更できない
    if (targetUser.id === session.user.id) {
      return NextResponse.json({ message: 'Cannot change your own role' }, { status: 400 })
    }

    // ロールを変更
    const { error: updateError } = await supabase
      .from('User')
      .update({ role: newRole })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return NextResponse.json({ message: 'Failed to update user role' }, { status: 500 })
    }

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
