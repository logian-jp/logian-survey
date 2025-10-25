// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）

console.log('⚠️  このスクリプトはSupabase SDK移行により一時無効化されています');
console.log('🔒 セキュリティ: データベースURL情報も無効化されました');
process.exit(0);

/* ORIGINAL CODE DISABLED - Security: DB URL removed
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
// Database URL removed for security
const prisma = new PrismaClient()
*/

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
    // await // prisma.$disconnect()
  }
}

importData()
