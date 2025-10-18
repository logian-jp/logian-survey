const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createUser() {
  try {
    console.log('Creating user...')
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('password123', 12)
    
    // 既存のユーザーを削除
    await prisma.user.deleteMany({
      where: { email: 'noutomi0729@gmail.com' }
    })
    
    // 新しいユーザーを作成
    const user = await prisma.user.create({
      data: {
        name: 'Takashi Notomi',
        email: 'noutomi0729@gmail.com',
        password: hashedPassword,
        role: 'USER'
      }
    })
    
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
