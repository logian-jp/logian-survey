// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function upgradeAdminPlan() {
  try {
    console.log('Upgrading admin plan...')
    
    // 管理者アカウントを検索
    const adminUser = await prisma.user.findUnique({
      where: { email: 'noutomi0729@gmail.com' }
    })
    
    if (!adminUser) {
      console.log('Admin user not found')
      return
    }
    
    console.log(`Found admin user: ${adminUser.name} (${adminUser.email})`)
    
    // 既存のユーザープランを確認
    const existingPlan = await prisma.userPlan.findUnique({
      where: { userId: adminUser.id }
    })
    
    if (existingPlan) {
      console.log(`Current plan: ${existingPlan.planType}`)
      
      // エンタープライズプランにアップグレード
      await prisma.userPlan.update({
        where: { userId: adminUser.id },
        data: {
          planType: 'ENTERPRISE',
          status: 'ACTIVE',
          updatedAt: new Date()
        }
      })
      
      console.log('Admin plan upgraded to ENTERPRISE')
    } else {
      // 新しいユーザープランを作成
      await prisma.userPlan.create({
        data: {
          userId: adminUser.id,
          planType: 'ENTERPRISE',
          status: 'ACTIVE',
          startDate: new Date()
        }
      })
      
      console.log('Admin plan created: ENTERPRISE')
    }
    
    console.log('Admin plan upgrade completed!')
    
  } catch (error) {
    console.error('Error upgrading admin plan:', error)
  } finally {
    await prisma.$disconnect()
  }
}

upgradeAdminPlan()
