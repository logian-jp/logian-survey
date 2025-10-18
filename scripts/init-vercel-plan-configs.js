const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initPlanConfigs() {
  try {
    console.log('Initializing plan configurations for Vercel...')
    
    const planConfigs = [
      {
        planType: 'FREE',
        name: '基本プラン',
        description: '個人利用に最適',
        price: 0,
        features: [
          'basic_questions',
          'sections',
          'page_breaks',
          'basic_analysis',
          'normalized_export'
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
          'all_question_types',
          'conditional_logic',
          'question_templates',
          'advanced_analysis',
          'standardized_export',
          'file_upload',
          'location_tracking',
          'rich_text_editor',
          'custom_branding',
          'api_integration',
          'priority_support'
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
          'all_question_types',
          'conditional_logic',
          'question_templates',
          'advanced_analysis',
          'standardized_export',
          'team_collaboration'
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
        description: '大企業・組織に最適',
        price: 9800,
        features: [
          'all_question_types',
          'conditional_logic',
          'question_templates',
          'advanced_analysis',
          'standardized_export',
          'team_collaboration',
          'custom_branding',
          'api_integration',
          'priority_support'
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
        description: '大規模組織・カスタム対応',
        price: 29800,
        features: [
          'all_question_types',
          'conditional_logic',
          'question_templates',
          'advanced_analysis',
          'standardized_export',
          'unlimited_team',
          'custom_branding',
          'api_integration',
          'priority_support',
          'sso_integration',
          'custom_domain',
          'sla_guarantee'
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
      await prisma.planConfig.upsert({
        where: { planType: config.planType },
        update: config,
        create: config
      })
      console.log(`✓ ${config.name} (${config.planType}) initialized`)
    }
    
    console.log('Plan configurations initialized successfully!')
    
  } catch (error) {
    console.error('Error initializing plan configurations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initPlanConfigs()
