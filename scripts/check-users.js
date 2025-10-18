const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('Checking users in database...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        createdAt: true
      }
    })

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
    const specificUser = await prisma.user.findUnique({
      where: { email: 'noutomi0729@gmail.com' }
    })

    if (specificUser) {
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
    await prisma.$disconnect()
  }
}

checkUsers()