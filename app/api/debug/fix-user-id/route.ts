import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('Fixing user ID mismatch...')
    
    // 現在のユーザーを取得 (Supabase SDK使用)
    const { data: currentUser, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', 'noutomi0729@gmail.com')
      .single()

    if (userError || !currentUser) {
      console.error('User not found:', userError)
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }
    
    console.log('Current user:', currentUser)
    
    // セッションのユーザーID
    const sessionUserId = 'cmgvyqjv70000tlq7oi97ukxe'
    
    // ユーザーIDを更新 (Supabase SDK使用)
    const { data: updatedUser, error: updateError } = await supabase
      .from('User')
      .update({ id: sessionUserId })
      .eq('id', currentUser.id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }
    
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
