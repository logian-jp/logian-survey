export interface PlanLimits {
  maxSurveys: number // -1 = 無制限
  maxResponsesPerSurvey: number // -1 = 無制限
  exportFormats: string[] // ['raw', 'normalized', 'standardized']
  features: string[] // 利用可能な機能
  price: number // 月額料金（円）
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxSurveys: 3,
    maxResponsesPerSurvey: 100,
    exportFormats: ['raw', 'normalized'], // 無料でも正規化までOK
    features: [
      'basic_questions',
      'sections',
      'page_breaks',
      'basic_analysis',
      'normalized_export'
    ],
    price: 0
  },
  STANDARD: {
    maxSurveys: -1, // 無制限
    maxResponsesPerSurvey: 1000,
    exportFormats: ['raw', 'normalized', 'standardized'],
    features: [
      'all_question_types',
      'conditional_logic',
      'question_templates',
      'advanced_analysis',
      'standardized_export',
      'team_collaboration'
    ],
    price: 2980
  },
  PROFESSIONAL: {
    maxSurveys: -1,
    maxResponsesPerSurvey: 10000,
    exportFormats: ['raw', 'normalized', 'standardized'],
    features: [
      'all_question_types',
      'conditional_logic',
      'question_templates',
      'advanced_analysis',
      'standardized_export',
      'team_collaboration',
      'custom_branding',
      'api_integration',
      'priority_support',
      'video_embedding',
      'location_tracking'
    ],
    price: 9800
  },
  ENTERPRISE: {
    maxSurveys: -1,
    maxResponsesPerSurvey: -1, // 無制限
    exportFormats: ['raw', 'normalized', 'standardized'],
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
      'sla_guarantee',
      'video_embedding',
      'location_tracking'
    ],
    price: 29800
  },
  ONETIME_UNLIMITED: {
    maxSurveys: 1, // 1つのアンケートのみ
    maxResponsesPerSurvey: -1, // 回答数無制限
    exportFormats: ['raw', 'normalized', 'standardized'],
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
      'priority_support',
      'video_embedding'
    ],
    price: 10000 // 1回限り10,000円
  }
}

export function getPlanLimits(planType: string): PlanLimits {
  return PLAN_LIMITS[planType] || PLAN_LIMITS.FREE
}

export function canUseVideoEmbedding(planType: string): boolean {
  const limits = getPlanLimits(planType)
  return limits.features.includes('video_embedding')
}

export function canUseLocationTracking(planType: string): boolean {
  const limits = getPlanLimits(planType)
  return limits.features.includes('location_tracking')
}

export function checkPlanFeature(planType: string, feature: string): boolean {
  const limits = getPlanLimits(planType)
  return limits.features.includes(feature)
}

export function checkPlanLimit(planType: string, limitType: 'maxSurveys' | 'maxResponsesPerSurvey', currentCount: number): boolean {
  const limits = getPlanLimits(planType)
  const limit = limits[limitType]
  
  if (limit === -1) return true // 無制限
  return currentCount < limit
}

// ユーザーのプラン情報を取得する関数
export async function getUserPlan(userId: string) {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  
  try {
    const userPlan = await prisma.userPlan.findUnique({
      where: { userId },
      select: {
        id: true,
        planType: true,
        status: true,
      }
    })
    
    if (!userPlan) {
      return null
    }
    
    // プラン制限情報を追加
    const planLimits = getPlanLimits(userPlan.planType)
    
    return {
      ...userPlan,
      maxSurveys: planLimits.maxSurveys,
      maxResponses: planLimits.maxResponsesPerSurvey,
      canUseVideoEmbedding: planLimits.features.includes('video_embedding'),
      canUseLocationTracking: planLimits.features.includes('location_tracking'),
    }
  } catch (error) {
    console.error('Failed to fetch user plan:', error)
    return null
  } finally {
    await prisma.$disconnect()
  }
}
