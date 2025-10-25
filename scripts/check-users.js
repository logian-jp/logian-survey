// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { createClient } = require('@supabase/supabase-js')

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkUsers() {
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

    // 特定のメールアドレスを検索
    const { data: specificUser, error: specificError } = await supabase
      .from('User')
      .select('*')
      .eq('email', 'noutomi0729@gmail.com')
      .single()

    if (specificUser && !specificError) {
      console.log('\nSpecific user (noutomi0729@gmail.com):')
      console.log(`- ID: ${specificUser.id}`)
      console.log(`- Name: ${specificUser.name || 'N/A'}`)
      console.log(`- Email: ${specificUser.email}`)
      console.log(`- Password: ${specificUser.password ? 'SET' : 'NULL'}`)
      console.log(`- Role: ${specificUser.role}`)
    } else {
      console.log('\nUser noutomi0729@gmail.com not found')
    }

  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    // await // prisma.$disconnect()
  }
}

checkUsers()