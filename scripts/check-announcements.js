// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
// const { PrismaClient } = require('@prisma/client')

// const prisma = new PrismaClient()

async function checkAnnouncements() {
  try {
    console.log('Checking announcements in database...')

    // お知らせテーブルの存在確認
    const announcements = await prisma.announcement.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log('Found announcements:', announcements.length)
    
    if (announcements.length > 0) {
      announcements.forEach((announcement, index) => {
        console.log(`${index + 1}. ${announcement.title}`)
        console.log(`   - ID: ${announcement.id}`)
        console.log(`   - Created by: ${announcement.creator?.name || 'Unknown'} (${announcement.creator?.email || 'N/A'})`)
        console.log(`   - Status: ${announcement.status}`)
        console.log(`   - Created at: ${announcement.createdAt}`)
        console.log('')
      })
    } else {
      console.log('No announcements found in database.')
    }

    // 管理者ユーザーも確認
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true }
    })

    console.log('Admin users:', adminUsers.length)
    adminUsers.forEach(admin => {
      console.log(`- ${admin.name} (${admin.email})`)
    })

  } catch (error) {
    console.error('Error checking announcements:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkAnnouncements()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
