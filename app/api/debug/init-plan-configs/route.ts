import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('Initializing plan configurations...')
    
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
    
    const results = []
    
    for (const config of planConfigs) {
      // 既存のプラン設定を確認 (Supabase SDK使用)
      const { data: existing } = await supabase
        .from('PlanConfig')
        .select('*')
        .eq('planType', config.planType)
        .single()

      let result
      if (existing) {
        // 更新
        const { data: updated, error: updateError } = await supabase
          .from('PlanConfig')
          .update(config)
          .eq('planType', config.planType)
          .select()
          .single()
        
        if (updateError) {
          console.error(`Failed to update ${config.planType}:`, updateError)
          throw updateError
        }
        result = updated
      } else {
        // 新規作成
        const { data: created, error: createError } = await supabase
          .from('PlanConfig')
          .insert(config)
          .select()
          .single()
        
        if (createError) {
          console.error(`Failed to create ${config.planType}:`, createError)
          throw createError
        }
        result = created
      }
      
      results.push(result)
      console.log(`✓ ${config.name} (${config.planType}) initialized`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Plan configurations initialized successfully',
      results
    })
    
  } catch (error) {
    console.error('Error initializing plan configurations:', error)
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to initialize plan configurations',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
