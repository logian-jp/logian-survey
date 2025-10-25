import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
export interface PlanLimits {
  maxSurveys: number // -1 = 無制限
  maxResponsesPerSurvey: number // -1 = 無制限
  exportFormats: string[] // ['raw', 'normalized', 'standardized']
  features: string[] // 利用可能な機能
  price: number // 単発料金（円）
  surveyDurationDays?: number // アンケート実施期間（日数）
  dataRetentionDays?: number // データ保存期間（日数）
  maxDataSizeMB?: number // 最大データサイズ（MB、-1で無制限）
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    maxSurveys: 3,
    maxResponsesPerSurvey: 100,
    exportFormats: ['raw'],
    features: [
      'basic_questions',
      'sections',
      'page_breaks',
      'basic_analysis',
      'conditional_logic'
      // YouTube埋め込み不可（video_embedding を含めない）
    ],
    price: 0,
    surveyDurationDays: 30,
    dataRetentionDays: 90,
    maxDataSizeMB: -1
  },
  STANDARD: {
    maxSurveys: -1,
    maxResponsesPerSurvey: 300,
    exportFormats: ['raw'],
    features: [
      'all_question_types',
      'conditional_logic',
      'file_upload',
      'video_embedding' // YouTube埋め込み可
    ],
    price: 2980,
    surveyDurationDays: 90,
    dataRetentionDays: 90,
    maxDataSizeMB: -1
  },
  PROFESSIONAL: {
    maxSurveys: -1,
    maxResponsesPerSurvey: 1000,
    exportFormats: ['raw', 'onehot', 'normalized', 'standardized'],
    features: [
      'all_question_types',
      'conditional_logic',
      'file_upload',
      'video_embedding',
      'normalized_export',
      'standardized_export',
      'api_integration', // Webhook/API連携可
    ],
    price: 10000,
    surveyDurationDays: 180,
    dataRetentionDays: 180,
    maxDataSizeMB: -1
  },
  ENTERPRISE: {
    maxSurveys: -1,
    maxResponsesPerSurvey: -1,
    exportFormats: ['raw', 'onehot', 'normalized', 'standardized'],
    features: [
      'all_question_types',
      'conditional_logic',
      'file_upload',
      'video_embedding',
      'normalized_export',
      'standardized_export',
      'api_integration', // Webhook/API連携可
      'priority_support',
      'enterprise_rewards' // PayPayポイントスキーム・API発行のプレースホルダ
    ],
    price: 50000,
    surveyDurationDays: 180,
    dataRetentionDays: 360,
    maxDataSizeMB: -1
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

// ユーザーのプラン情報を取得する関数（チケット制度移行により簡易版）
export async function getUserPlan(userId: string) {
  try {
    // TODO: チケット制度移行により、常にFREEプランを返す
    const userPlan = {
      id: 'ticket-system',
      planType: 'FREE',
      status: 'ACTIVE'
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
  }
}


// データ使用量を記録する関数 (Supabase SDK使用)
export async function recordDataUsage(
  userId: string, 
  surveyId: string | null, 
  dataType: string, 
  sizeBytes: number, 
  description?: string
) {
  try {
    const { error } = await supabase
      .from('DataUsage')
      .insert({
        userId,
        surveyId,
        dataType,
        sizeBytes,
        description
      })
    
    if (error) {
      console.error('Failed to record data usage:', error)
    }
  } catch (error) {
    console.error('Failed to record data usage:', error)
  }
}

// ユーザーのデータ使用量を取得する関数 (Supabase SDK使用)
export async function getUserDataUsage(userId: string) {
  try {
    const { data: usageData, error } = await supabase
      .from('DataUsage')
      .select('sizeBytes')
      .eq('userId', userId)
    
    if (error) {
      console.error('Failed to fetch user data usage:', error)
      return { totalBytes: 0, totalMB: 0 }
    }
    
    const totalBytes = (usageData || []).reduce((sum, item) => sum + (item.sizeBytes || 0), 0)
    
    return {
      totalBytes: totalBytes,
      totalMB: Math.round(totalBytes / (1024 * 1024) * 100) / 100
    }
  } catch (error) {
    console.error('Failed to fetch user data usage:', error)
    return { totalBytes: 0, totalMB: 0 }
  }
}

// ユーザーの最大データ容量を取得する関数（アドオンを含む）
export async function getUserMaxDataSize(userId: string, planType: string): Promise<number> {
  try {
    // 基本プランの容量制限を取得
    const planLimits = getPlanLimits(planType)
    let maxDataSizeMB: number = planLimits.maxDataSizeMB as number

    // ユーザーのアクティブな容量追加アドオンを取得 (Supabase SDK使用)
    const { data: storageAddons, error } = await supabase
      .from('UserDataAddon')
      .select(`
        *,
        addon:DataAddon(*)
      `)
      .eq('userId', userId)
      .eq('status', 'ACTIVE')
      .or('expiresAt.is.null,expiresAt.gt.' + new Date().toISOString())

    if (error) {
      console.error('Failed to fetch storage addons:', error)
      return maxDataSizeMB
    }

    // 追加容量を合計
    const additionalStorageMB = (storageAddons || [])
      .filter((addon: any) => addon.addon?.type === 'storage' && addon.addon?.isActive)
      .reduce((total: number, addon: any) => total + (addon.addon?.amount || 0), 0)
    
    return maxDataSizeMB === -1 ? -1 : maxDataSizeMB + additionalStorageMB
  } catch (error) {
    console.error('Failed to fetch user max data size:', error)
    return (getPlanLimits(planType).maxDataSizeMB as number)
  }
}

// ユーザーのデータ保存期間を取得する関数（アドオンを含む）
export async function getUserDataRetentionDays(userId: string, planType: string): Promise<number> {
  try {
    // 基本プランの保存期間を取得
    const planLimits = getPlanLimits(planType)
    let dataRetentionDays: number = planLimits.dataRetentionDays as number

    // ユーザーのアクティブな保存期間延長アドオンを取得 (Supabase SDK使用)
    const { data: retentionAddons, error } = await supabase
      .from('UserDataAddon')
      .select(`
        *,
        addon:DataAddon(*)
      `)
      .eq('userId', userId)
      .eq('status', 'ACTIVE')
      .or('expiresAt.is.null,expiresAt.gt.' + new Date().toISOString())

    if (error) {
      console.error('Failed to fetch retention addons:', error)
      return dataRetentionDays
    }

    // 延長期間を合計
    const additionalRetentionDays = (retentionAddons || [])
      .filter((addon: any) => addon.addon?.type === 'retention' && addon.addon?.isActive)
      .reduce((total: number, addon: any) => total + (addon.addon?.amount || 0), 0)
    
    return dataRetentionDays + additionalRetentionDays
  } catch (error) {
    console.error('Failed to fetch user data retention days:', error)
    return (getPlanLimits(planType).dataRetentionDays as number)
  }
}
