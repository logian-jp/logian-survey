import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザー情報を取得 (Supabase SDK使用)
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('id, name, email, emailVerified, image, createdAt')
      .eq('id', session.user.id)

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ message: 'Failed to fetch user' }, { status: 500 })
    }

    const user = users?.[0]

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 })
    }

    // ユーザー情報を更新 (Supabase SDK使用)
    const { data: updatedUsers, error: updateError } = await supabase
      .from('User')
      .update({ name: name.trim() })
      .eq('id', session.user.id)
      .select('id, name, email, emailVerified, image, createdAt')

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({ message: 'Failed to update user' }, { status: 500 })
    }

    const updatedUser = updatedUsers?.[0]

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
