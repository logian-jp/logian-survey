import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== User Detail API Called ===')
    console.log('User ID:', (await params).id)
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.email, session?.user?.role)

    if (!session || session.user?.role !== 'ADMIN') {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = (await params).id
    console.log('Fetching user with ID:', userId)

    // ユーザー詳細情報を取得 (Supabase SDK使用)
    console.log('Starting user query...')
    const { data: users, error: userError } = await supabase
      .from('User')
      .select(`
        *,
        surveys:Survey(id, title, status, createdAt)
      `)
      .eq('id', userId)

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ message: 'Failed to fetch user' }, { status: 500 })
    }

    const user = users?.[0]

    console.log('User query completed, user found:', !!user)

    if (!user) {
      console.log('User not found for ID:', userId)
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Returning user data')
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Failed to fetch user details:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
