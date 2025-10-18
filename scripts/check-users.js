const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('🔍 ユーザーテーブルの内容を確認中...')
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    })
    
    console.log('📊 ユーザー一覧:')
    console.log(users)
    
    if (users.length === 0) {
      console.log('❌ ユーザーが存在しません')
    } else {
      console.log(`✅ ${users.length}人のユーザーが見つかりました`)
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
