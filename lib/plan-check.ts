import { createClient } from '@supabase/supabase-js'
import { getPlanLimits, checkPlanFeature, checkPlanLimit } from '@/lib/plan-limits'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getUserPlan(userId: string) {
  // TODO: チケット制度移行により、常にFREEプランを返す
  return {
    id: 'ticket-system',
    userId,
    planType: 'FREE',
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

export async function checkSurveyLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    const userPlan = await getUserPlan(userId)
    const limits = getPlanLimits(userPlan.planType)
    
    if (limits.maxSurveys === -1) {
      return { allowed: true }
    }

    const { count: surveyCount, error: countError } = await supabase
      .from('Survey')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)

    if (countError) {
      throw countError
    }

    if ((surveyCount || 0) >= limits.maxSurveys) {
      return {
        allowed: false,
        message: `アンケート作成数の上限（${limits.maxSurveys}個）に達しています。プランをアップグレードしてください。`
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Failed to check survey limit:', error)
    // エラーの場合は無料プランの制限を適用
    const limits = getPlanLimits('FREE')
    try {
      const { count: surveyCount, error: countError } = await supabase
        .from('Survey')
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId)
      
      if (!countError && (surveyCount || 0) >= limits.maxSurveys) {
        return {
          allowed: false,
          message: `アンケート作成数の上限（${limits.maxSurveys}個）に達しています。プランをアップグレードしてください。`
        }
      }
    } catch (dbError) {
      console.error('Database error in survey limit check:', dbError)
    }
    
    return { allowed: true }
  }
}

// プラン枠数のチェック（チケット制度移行により常に許可）
export async function checkPlanSlotLimit(userId: string, planType: string): Promise<{ allowed: boolean; message?: string; remainingSlots?: number }> {
  // TODO: チケット制度移行により、常に許可
  return {
    allowed: true,
    remainingSlots: 999
  }
}

// プラン枠の消費（チケット制度移行により常に成功）
export async function consumePlanSlot(userId: string, planType: string): Promise<{ success: boolean; message?: string }> {
  // TODO: チケット制度移行により、常に成功
  return { success: true }
}

export async function checkResponseLimit(surveyId: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    console.log('checkResponseLimit called for surveyId:', surveyId)
    
    // NOTE: チケット制度移行により常に許可（簡略化）
    console.log('Temporarily allowing all responses for debugging')
    return { allowed: true }
  } catch (error) {
    console.error('Error checking response limit:', error)
    return { allowed: false, message: '回答制限の確認中にエラーが発生しました' }
  }
}

export async function checkExportFormat(userId: string, format: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    console.log('checkExportFormat called with userId:', userId, 'format:', format)
    
    // NOTE: チケット制度移行により常に許可（簡略化）
    console.log('Temporarily allowing all export formats for debugging')
    return { allowed: true }
  } catch (error) {
    console.error('Error in checkExportFormat:', error)
    return { allowed: false, message: 'エクスポート形式の確認中にエラーが発生しました' }
  }
}

export async function checkFeature(userId: string, feature: string): Promise<{ allowed: boolean; message?: string }> {
  const userPlan = await getUserPlan(userId)
  
  if (!checkPlanFeature(userPlan.planType, feature)) {
    return {
      allowed: false,
      message: `この機能は${userPlan.planType}プランでは利用できません。プランをアップグレードしてください。`
    }
  }

  return { allowed: true }
}
