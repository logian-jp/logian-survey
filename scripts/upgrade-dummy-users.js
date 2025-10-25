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

async function upgradeDummyUsers() {
  try {
    console.log('Upgrading dummy users to paid plans...')
    
    // 全てのユーザーを取得
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: '@example.com'
        }
      }
    })
    
    console.log(`Found ${users.length} dummy users`)
    
    const planTypes = ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE', 'ONETIME_UNLIMITED']
    
    for (const user of users) {
      try {
        // 既存のユーザープランを確認
        const existingPlan = await prisma.userPlan.findUnique({
          where: { userId: user.id }
        })
        
        if (existingPlan) {
          // 既存のプランを有料プランにアップグレード
          const randomPlan = planTypes[Math.floor(Math.random() * planTypes.length)]
          await prisma.userPlan.update({
            where: { userId: user.id },
            data: {
              planType: randomPlan,
              status: 'ACTIVE',
              updatedAt: new Date()
            }
          })
          console.log(`Updated ${user.name}: ${existingPlan.planType} -> ${randomPlan}`)
        } else {
          // 新しいユーザープランを作成
          const randomPlan = planTypes[Math.floor(Math.random() * planTypes.length)]
          await prisma.userPlan.create({
            data: {
              userId: user.id,
              planType: randomPlan,
              status: 'ACTIVE',
              startDate: new Date()
            }
          })
          console.log(`Created plan for ${user.name}: ${randomPlan}`)
        }
        
      } catch (error) {
        console.error(`Error processing user ${user.name}:`, error)
      }
    }
    
    console.log('Dummy users upgrade completed!')
    
  } catch (error) {
    console.error('Error upgrading dummy users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

upgradeDummyUsers()
