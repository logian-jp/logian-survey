const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Qv6qnz5UchRk@ep-snowy-cherry-a1zyl46o-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
})

async function exportData() {
  try {
    console.log('Starting data export...')
    
    // 全テーブルのデータをエクスポート
    const data = {
      users: await prisma.user.findMany(),
      accounts: await prisma.account.findMany(),
      surveys: await prisma.survey.findMany(),
      questions: await prisma.question.findMany(),
      responses: await prisma.response.findMany(),
      responseAnswers: await prisma.responseAnswer.findMany(),
      questionTemplates: await prisma.questionTemplate.findMany(),
      planConfigs: await prisma.planConfig.findMany(),
      userPlans: await prisma.userPlan.findMany(),
      collaborations: await prisma.collaboration.findMany(),
      announcements: await prisma.announcement.findMany(),
      announcementDeliveries: await prisma.announcementDelivery.findMany(),
    }
    
    // JSONファイルとして保存
    fs.writeFileSync('data_export.json', JSON.stringify(data, null, 2))
    console.log('Data exported to data_export.json')
    
    // 各テーブルの件数を表示
    Object.entries(data).forEach(([table, records]) => {
      console.log(`${table}: ${records.length} records`)
    })
    
  } catch (error) {
    console.error('Export failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportData()
