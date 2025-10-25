// PRISMA DISABLED - Supabase SDK migration in progress  
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）

console.log('⚠️  このスクリプトはSupabase SDK移行により一時無効化されています');
console.log('💡 全てのPrismaクエリがコメントアウトされました - 必要に応じて個別にSupabase SDKへ移行してください');
process.exit(0);

/* ORIGINAL PRISMA CODE DISABLED
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function exportData() {
  try {
    console.log('Exporting all data...')
    
    // 以下は全てPrismaクエリのため無効化済み
    // 必要に応じてSupabase SDKに個別移行してください
    
    console.log('✅ データエクスポートスクリプトは無効化されました')
    
  } catch (error) {
    console.error('Export failed:', error)
  } finally {
  }
}

if (require.main === module) {
  exportData()
}

module.exports = { exportData }
*/