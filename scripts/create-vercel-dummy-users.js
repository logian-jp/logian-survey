// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function createDummyUsers() {
  try {
    console.log('Creating dummy users for Vercel...')
    
    // ダミーユーザーを作成
    const dummyUsers = [
      {
        name: '田中太郎',
        email: 'tanaka@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG', // password123
        role: 'USER'
      },
      {
        name: '佐藤花子',
        email: 'sato@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG',
        role: 'USER'
      },
      {
        name: '鈴木一郎',
        email: 'suzuki@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG',
        role: 'USER'
      },
      {
        name: '高橋美咲',
        email: 'takahashi@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG',
        role: 'USER'
      },
      {
        name: '山田健太',
        email: 'yamada@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG',
        role: 'USER'
      }
    ]
    
    for (const userData of dummyUsers) {
      try {
        const user = await prisma.user.create({
          data: userData
        })
        console.log(`Created user: ${user.name} (${user.email})`)
        
        // ユーザープランを作成（今月の日付で）
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        // ランダムなプランを割り当て
        const planTypes = ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE', 'ONETIME_UNLIMITED']
        const randomPlan = planTypes[Math.floor(Math.random() * planTypes.length)]
        
        await prisma.userPlan.create({
          data: {
            userId: user.id,
            planType: randomPlan,
            status: 'ACTIVE',
            startDate: startOfMonth
          }
        })
        
        console.log(`  -> Assigned plan: ${randomPlan}`)
        
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`User ${userData.email} already exists, skipping...`)
        } else {
          console.error(`Error creating user ${userData.email}:`, error)
        }
      }
    }
    
    console.log('Dummy users creation completed!')
    
  } catch (error) {
    console.error('Error creating dummy users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createDummyUsers()
