// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

// Supabaseデータベースに接続
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:cPNyaj92Vk2S0MC@db.xoovzxmgmqtdtwgxwgcp.supabase.co:5432/postgres"
    }
  }
})

async function importData() {
  try {
    console.log('Starting data import to Supabase...')
    
    // エクスポートされたデータを読み込み
    const data = JSON.parse(fs.readFileSync('data_export.json', 'utf8'))
    
    // 外部キー制約の順序でテーブルをインポート
    const importOrder = [
      'users',
      'accounts', 
      'sessions',
      'verificationTokens',
      'userPlans',
      'planConfigs',
      'discountLinks',
      'questionTemplates',
      'surveys',
      'surveyUsers',
      'questions',
      'responses',
      'answers',
      'fileUploads',
      'announcements',
      'announcementDeliveries'
    ]
    
    for (const tableName of importOrder) {
      if (data[tableName] && data[tableName].length > 0) {
        console.log(`Importing ${tableName}...`)
        
        // Prismaモデル名のマッピング
        const modelMap = {
          'users': 'user',
          'accounts': 'account',
          'sessions': 'session',
          'verificationTokens': 'verificationToken',
          'userPlans': 'userPlan',
          'planConfigs': 'planConfig',
          'discountLinks': 'discountLink',
          'questionTemplates': 'questionTemplate',
          'surveys': 'survey',
          'surveyUsers': 'surveyUser',
          'questions': 'question',
          'responses': 'response',
          'answers': 'answer',
          'fileUploads': 'fileUpload',
          'announcements': 'announcement',
          'announcementDeliveries': 'announcementDelivery'
        }
        
        const modelName = modelMap[tableName]
        const model = prisma[modelName]
        
        if (model && model.createMany) {
          try {
            const result = await model.createMany({
              data: data[tableName],
              skipDuplicates: true
            })
            console.log(`✓ ${tableName}: ${result.count} records imported`)
          } catch (error) {
            console.error(`✗ Error importing ${tableName}:`, error.message)
            console.error('Sample data:', JSON.stringify(data[tableName][0], null, 2))
          }
        } else {
          console.log(`⚠ ${tableName}: Model not found or createMany not available`)
        }
      }
    }
    
    console.log('Data import completed!')
    
  } catch (error) {
    console.error('Import failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importData()
