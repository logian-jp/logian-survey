const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setAdminPassword() {
  try {
    const email = 'noutomi0729@gmail.com'
    const password = 'aaaaaa'
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10)
    console.log('Hashed password:', hashedPassword)
    
    // ユーザーを更新または作成
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        updatedAt: new Date()
      },
      create: {
        email,
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Admin user updated:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasPassword: !!user.password
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setAdminPassword()
