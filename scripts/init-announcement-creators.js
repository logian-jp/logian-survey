const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initAnnouncementCreators() {
  try {
    console.log('Initializing announcement creators...')

    // 管理者ユーザーを取得
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true }
    })

    console.log('Found admin users:', adminUsers.length)

    if (adminUsers.length === 0) {
      console.log('No admin users found. Creating a default admin user...')
      
      // デフォルトの管理者ユーザーを作成
      const defaultAdmin = await prisma.user.create({
        data: {
          name: 'System Admin',
          email: 'admin@logian-survey.com',
          role: 'ADMIN',
          maxInvitations: 10,
          usedInvitations: 0
        }
      })
      
      adminUsers.push(defaultAdmin)
      console.log('Created default admin user:', defaultAdmin.id)
    }

    // 全てのお知らせを取得
    const allAnnouncements = await prisma.announcement.findMany({
      select: { id: true, title: true, createdBy: true, createdAt: true }
    })

    console.log('Found announcements:', allAnnouncements.length)

    // createdByが設定されていないお知らせを更新
    const announcementsToUpdate = allAnnouncements.filter(a => !a.createdBy)
    
    if (announcementsToUpdate.length > 0) {
      console.log(`Updating ${announcementsToUpdate.length} announcements without creator...`)
      
      // 最初の管理者をデフォルトの作成者として設定
      const defaultCreatorId = adminUsers[0].id
      
      for (const announcement of announcementsToUpdate) {
        await prisma.announcement.update({
          where: { id: announcement.id },
          data: { createdBy: defaultCreatorId }
        })
        console.log(`Updated announcement: ${announcement.title}`)
      }
    }

    // 結果を確認
    const updatedAnnouncements = await prisma.announcement.findMany({
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

    console.log('All announcements with creators:')
    updatedAnnouncements.forEach(announcement => {
      console.log(`- ${announcement.title} (created by: ${announcement.creator?.name || 'Unknown'})`)
    })

    console.log('Announcement creators initialization completed successfully!')
  } catch (error) {
    console.error('Error initializing announcement creators:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

initAnnouncementCreators()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })