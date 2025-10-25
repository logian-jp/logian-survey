// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createUser() {
  try {
    console.log('Creating user...')
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    // 既存のユーザーを削除 (Supabase SDK使用)
    await supabase
      .from('User')
      .delete()
      .eq('email', 'noutomi0729@gmail.com')
    
    // 新しいユーザーを作成 (Supabase SDK使用)
    const { data: user, error } = await supabase
      .from('User')
      .insert({
        name: 'Takashi Notomi',
        email: 'noutomi0729@gmail.com',
        password: hashedPassword,
        role: 'USER'
      })
      .select()
      .single()

    if (error) {
      throw error
    }
    
    console.log('User created successfully:')
    console.log(`- ID: ${user.id}`)
    console.log(`- Name: ${user.name}`)
    console.log(`- Email: ${user.email}`)
    console.log(`- Password: SET`)
    console.log(`- Role: ${user.role}`)
    
    // ユーザープランも作成
    const userPlan = await prisma.userPlan.create({
      data: {
        userId: user.id,
        planType: 'FREE',
        status: 'ACTIVE',
        startDate: new Date()
      }
    })
    
    console.log('User plan created:')
    console.log(`- Plan Type: ${userPlan.planType}`)
    console.log(`- Status: ${userPlan.status}`)
    
  } catch (error) {
    console.error('Error creating user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser()
