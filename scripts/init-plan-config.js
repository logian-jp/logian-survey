// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function initPlanConfig() {
  try {
    console.log('Initializing plan configuration...')
    
    // 既存のプラン設定をクリア
    await prisma.planConfig.deleteMany({})
    console.log('Cleared existing plan configurations')
    
    // プラン設定を作成
    const planConfigs = [
      {
        planType: 'FREE',
        name: '基本プラン',
        price: 0,
        features: ['基本機能', 'CSV出力（raw）'],
        limits: {
          maxSurveys: 3,
          maxResponsesPerSurvey: 100,
          exportFormats: ['raw']
        },
        isActive: true
      },
      {
        planType: 'STANDARD',
        name: 'スタンダードプラン',
        price: 2980,
        features: ['基本機能', 'CSV出力（raw, normalized）', '高度な分析'],
        limits: {
          maxSurveys: 10,
          maxResponsesPerSurvey: 1000,
          exportFormats: ['raw', 'normalized']
        },
        isActive: true
      },
      {
        planType: 'PROFESSIONAL',
        name: 'プロフェッショナルプラン',
        price: 9800,
        features: ['全機能', 'CSV出力（全形式）', 'API連携', '優先サポート'],
        limits: {
          maxSurveys: 50,
          maxResponsesPerSurvey: 5000,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true
      },
      {
        planType: 'ENTERPRISE',
        name: 'エンタープライズプラン',
        price: 29800,
        features: ['無制限', '全機能', '専用サポート', 'カスタム機能'],
        limits: {
          maxSurveys: -1,
          maxResponsesPerSurvey: -1,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true
      },
      {
        planType: 'ONETIME_UNLIMITED',
        name: '単発無制限プラン',
        price: 10000,
        features: ['単発アンケート無制限', '全機能', '1回限り'],
        limits: {
          maxSurveys: -1,
          maxResponsesPerSurvey: -1,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true
      }
    ]
    
    for (const config of planConfigs) {
      await prisma.planConfig.create({
        data: config
      })
      console.log(`Created plan config: ${config.name} (${config.planType}) - ¥${config.price}`)
    }
    
    console.log('Plan configuration initialization completed!')
    
    // 確認
    const createdConfigs = await prisma.planConfig.findMany()
    console.log(`Total plan configs created: ${createdConfigs.length}`)
    
  } catch (error) {
    console.error('Error initializing plan config:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initPlanConfig()
