const { PrismaClient } = require('@prisma/client')

// Supabaseデータベースに接続
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:cPNyaj92Vk2S0MC@db.xoovzxmgmqtdtwgxwgcp.supabase.co:5432/postgres"
    }
  }
})

async function verifyMigration() {
  try {
    console.log('Verifying data migration to Supabase...')
    
    // 各テーブルのレコード数を確認
    const counts = {
      users: await prisma.user.count(),
      accounts: await prisma.account.count(),
      sessions: await prisma.session.count(),
      verificationTokens: await prisma.verificationToken.count(),
      surveys: await prisma.survey.count(),
      surveyUsers: await prisma.surveyUser.count(),
      questions: await prisma.question.count(),
      responses: await prisma.response.count(),
      answers: await prisma.answer.count(),
      fileUploads: await prisma.fileUpload.count(),
      questionTemplates: await prisma.questionTemplate.count(),
      userPlans: await prisma.userPlan.count(),
      discountLinks: await prisma.discountLink.count(),
      planConfigs: await prisma.planConfig.count(),
      announcements: await prisma.announcement.count(),
      announcementDeliveries: await prisma.announcementDelivery.count(),
    }
    
    console.log('\n📊 Supabase Database Record Counts:')
    console.log('================================')
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`${table}: ${count} records`)
    })
    
    // サンプルデータを表示
    console.log('\n👥 Sample Users:')
    const users = await prisma.user.findMany({ take: 3 })
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name || 'No name'})`)
    })
    
    console.log('\n📋 Sample Surveys:')
    const surveys = await prisma.survey.findMany({ take: 3 })
    surveys.forEach(survey => {
      console.log(`- ${survey.title} (${survey.status})`)
    })
    
    console.log('\n✅ Data migration verification completed!')
    
  } catch (error) {
    console.error('Verification failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyMigration()
