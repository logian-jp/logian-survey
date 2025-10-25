import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { id, email, name, image } = await request.json()

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ユーザーが既に存在するかチェック (Supabase SDK使用)
    const { data: existingUser, error: userCheckError } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single()

    if (existingUser && !userCheckError) {
      // 既存ユーザーの情報を更新
      const { error: updateError } = await supabase
        .from('User')
        .update({
          name: name || existingUser.name,
          image: image || existingUser.image,
          updatedAt: new Date().toISOString()
        })
        .eq('email', email)

      if (updateError) {
        console.error('Failed to update user:', updateError)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }
    } else {
      // 新規ユーザーを作成
      const { error: createError } = await supabase
        .from('User')
        .insert({
          id,
          email,
          name: name || email,
          image,
          role: 'USER',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

      if (createError) {
        console.error('Failed to create user:', createError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      // TODO: チケット制度移行により、プラン設定を削除
      // デフォルトでチケット制度を使用（プラン設定不要）
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
