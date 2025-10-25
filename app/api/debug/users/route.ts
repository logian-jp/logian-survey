import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Checking users in database...')
    
    // ユーザー一覧を取得 (Supabase SDK使用)
    const { data: users, error } = await supabase
      .from('User')
      .select('id, name, email, password, role, createdAt')

    if (error) {
      throw error
    }

    console.log(`Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`- ID: ${user.id}`)
      console.log(`  Name: ${user.name || 'N/A'}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Password: ${user.password ? 'SET' : 'NULL'}`)
      console.log(`  Role: ${user.role}`)
      console.log(`  Created: ${user.createdAt}`)
      console.log('---')
    })

    return NextResponse.json({
      count: users.length,
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password ? 'SET' : 'NULL',
        role: user.role,
        createdAt: user.createdAt
      }))
    })
  } catch (error) {
    console.error('Error checking users:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
