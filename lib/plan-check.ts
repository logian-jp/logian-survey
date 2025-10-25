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
    
    // 一時的に簡略化：常に許可
    console.log('Temporarily allowing all responses for debugging')
    return { allowed: true }
    
    /*
    let survey
    try {
      survey = await prisma.survey.findUnique({
        where: { id: surveyId },
        include: { user: { include: { userPlan: true } } }
      })
      console.log('Survey query completed, found:', !!survey)
    } catch (dbError) {
      console.error('Database error in survey query:', dbError)
      throw dbError
    }

    if (!survey) {
      console.log('Survey not found')
      return { allowed: false, message: 'アンケートが見つかりません' }
    }

    // ユーザープランが存在しない場合は無料プランとして扱う
    if (!survey.user.userPlan) {
      console.log('User plan not found, treating as FREE plan')
      let limits
      try {
        limits = getPlanLimits('FREE')
        console.log('FREE plan limits:', limits)
      } catch (limitsError) {
        console.error('Error getting FREE plan limits:', limitsError)
        throw limitsError
      }
      
      if (limits.maxResponsesPerSurvey === -1) {
        console.log('FREE plan has unlimited responses')
        return { allowed: true }
      }
      
      // 現在の回答数を取得
      let currentResponseCount
      try {
        currentResponseCount = await prisma.response.count({
          where: { surveyId }
        })
        console.log('Current response count:', currentResponseCount, 'Limit:', limits.maxResponsesPerSurvey)
      } catch (countError) {
        console.error('Error counting responses:', countError)
        throw countError
      }
      
      if (currentResponseCount >= limits.maxResponsesPerSurvey) {
        console.log('Response limit exceeded')
        return { allowed: false, message: '回答数の上限に達しています' }
      }
      
      console.log('Response limit check passed for FREE plan')
      return { allowed: true }
    }
    */

    /*
    // ユーザープランが存在する場合の処理
    const limits = getPlanLimits(survey.user.userPlan.planType)
    
    if (limits.maxResponsesPerSurvey === -1) {
      return { allowed: true }
    }

    // 追加回答数アドオン（スタンダード以上）を合算
    let additionalResponses = 0
    try {
      const addons = await (prisma as any).userDataAddon.findMany({
        where: {
          userId: survey.userId,
          status: 'ACTIVE',
          surveyId: surveyId, // このアンケートに紐づいたアドオン
          addon: {
            type: 'responses',
            isActive: true
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: { addon: true }
      })
      additionalResponses = addons.reduce((total: number, a: { addon: { amount: number } }) => total + (a.addon.amount || 0), 0)
    } catch (e) {
      // 取得失敗時は追加0として続行
    }

    // 有効上限を計算（プラン上限 + アドオン）。アンケートごとの個別上限が設定されていれば下限に合わせる
    const baseLimit = limits.maxResponsesPerSurvey
    const effectivePlanLimit = baseLimit === -1 ? -1 : baseLimit + additionalResponses
    const perSurveyLimit = survey.maxResponses ?? null
    const effectiveLimit = effectivePlanLimit === -1
      ? (perSurveyLimit ?? -1)
      : (perSurveyLimit ? Math.min(effectivePlanLimit, perSurveyLimit) : effectivePlanLimit)

    // 無制限（-1）の場合は許可
    if (effectiveLimit === -1) {
      return { allowed: true }
    }

    const responseCount = await prisma.response.count({ where: { surveyId } })

    if (responseCount >= effectiveLimit) {
      return {
        allowed: false,
        message: `回答数の上限（${effectiveLimit}件）に達しています。アドオンを追加購入するか、プランを見直してください。`
      }
    }

    return { allowed: true }
    */
  } catch (error) {
    console.error('Error checking response limit:', error)
    return { allowed: false, message: '回答制限の確認中にエラーが発生しました' }
  }
}

export async function checkExportFormat(userId: string, format: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    console.log('checkExportFormat called with userId:', userId, 'format:', format)
    
    // 一時的に簡略化：常に許可
    console.log('Temporarily allowing all export formats for debugging')
    return { allowed: true }
    
    /*
    const userPlan = await getUserPlan(userId)
    console.log('User plan retrieved:', userPlan.planType)
    
    const limits = getPlanLimits(userPlan.planType)
    console.log('Plan limits:', limits.exportFormats)

    if (!limits.exportFormats.includes(format)) {
      console.log('Export format not allowed:', format, 'for plan:', userPlan.planType)
      return {
        allowed: false,
        message: `${format}形式のエクスポートは${userPlan.planType}プランでは利用できません。プランをアップグレードしてください。`
      }
    }

    console.log('Export format check passed')
    return { allowed: true }
    */
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
