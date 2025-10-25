import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // セッションを無効化するために、データベースからセッションを削除 (Supabase SDK使用)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { error } = await supabase
      .from('Session')
      .delete()
      .eq('userId', session.user.id)

    if (error) {
      console.error('Failed to clear sessions:', error)
      return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Session cleared successfully' })
  } catch (error) {
    console.error('Error clearing session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
