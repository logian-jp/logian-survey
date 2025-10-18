const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedPlanConfigs() {
  try {
    console.log('Seeding plan configurations...')

    // 既存のプラン設定を削除
    await prisma.planConfig.deleteMany({})

    // デフォルトのプラン設定を作成
    const planConfigs = [
      {
        planType: 'FREE',
        name: '基本プラン',
        description: '個人利用に最適',
        price: 0,
        features: [
          'アンケート作成: 3個まで',
          '回答数: 100件/アンケート',
          '基本質問タイプ',
          'CSV出力（通常・正規化データ）',
          'セクション・改ページ機能'
        ],
        limits: {
          maxSurveys: 3,
          maxResponsesPerSurvey: 100,
          exportFormats: ['raw', 'normalized']
        },
        isActive: true,
        sortOrder: 1
      },
      {
        planType: 'ONETIME_UNLIMITED',
        name: '単発無制限プラン',
        description: '1回限り・全機能開放',
        price: 10000,
        features: [
          'アンケート作成: 1個のみ',
          '回答数: 無制限',
          '全質問タイプ・全機能',
          '条件分岐・ファイルアップロード',
          '位置情報取得・リッチテキスト',
          'カスタムブランディング',
          'API連携・優先サポート',
          '全データ形式エクスポート'
        ],
        limits: {
          maxSurveys: 1,
          maxResponsesPerSurvey: -1,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true,
        sortOrder: 2
      },
      {
        planType: 'STANDARD',
        name: 'スタンダードプラン',
        description: '中小企業に最適',
        price: 2980,
        features: [
          'アンケート作成: 無制限',
          '回答数: 1,000件/アンケート',
          '全質問タイプ',
          '高度な分析機能',
          '条件分岐ロジック',
          '質問テンプレート',
          'チーム機能'
        ],
        limits: {
          maxSurveys: -1,
          maxResponsesPerSurvey: 1000,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true,
        sortOrder: 3
      },
      {
        planType: 'PROFESSIONAL',
        name: 'プロフェッショナルプラン',
        description: '大企業に最適',
        price: 9800,
        features: [
          'アンケート作成: 無制限',
          '回答数: 10,000件/アンケート',
          '全質問タイプ',
          '高度な分析機能',
          '条件分岐ロジック',
          '質問テンプレート',
          'チーム機能',
          'カスタムブランディング',
          'API連携',
          '優先サポート'
        ],
        limits: {
          maxSurveys: -1,
          maxResponsesPerSurvey: 10000,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true,
        sortOrder: 4
      },
      {
        planType: 'ENTERPRISE',
        name: 'エンタープライズプラン',
        description: '大規模組織に最適',
        price: 29800,
        features: [
          'アンケート作成: 無制限',
          '回答数: 無制限',
          '全質問タイプ',
          '高度な分析機能',
          '条件分岐ロジック',
          '質問テンプレート',
          '無制限チーム機能',
          'カスタムブランディング',
          'API連携',
          '優先サポート',
          'SSO連携',
          'カスタムドメイン',
          'SLA保証'
        ],
        limits: {
          maxSurveys: -1,
          maxResponsesPerSurvey: -1,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true,
        sortOrder: 5
      }
    ]

    for (const config of planConfigs) {
      await prisma.planConfig.create({
        data: config
      })
      console.log(`Created plan config: ${config.name}`)
    }

    console.log('Plan configurations seeded successfully!')
  } catch (error) {
    console.error('Error seeding plan configurations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedPlanConfigs()
