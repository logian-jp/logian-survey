import { prisma } from '@/lib/prisma'
import { getPlanLimits, checkPlanFeature, checkPlanLimit } from '@/lib/plan-limits'

export async function getUserPlan(userId: string) {
  try {
    let userPlan = await prisma.userPlan.findUnique({
      where: { userId }
    })

    // プランが存在しない場合は無料プランを作成
    if (!userPlan) {
      try {
        userPlan = await prisma.userPlan.create({
          data: {
            userId,
            planType: 'FREE',
            status: 'ACTIVE'
          }
        })
      } catch (error) {
        console.error('Failed to create user plan:', error)
        // エラーの場合は仮想的な無料プランを返す
        return {
          id: 'temp',
          userId,
          planType: 'FREE',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    }

    return userPlan
  } catch (error) {
    console.error('Failed to get user plan:', error)
    // データベースエラーの場合は仮想的な無料プランを返す
    return {
      id: 'fallback',
      userId,
      planType: 'FREE',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}

export async function checkSurveyLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
  try {
    const userPlan = await getUserPlan(userId)
    const limits = getPlanLimits(userPlan.planType)
    
    if (limits.maxSurveys === -1) {
      return { allowed: true }
    }

    const surveyCount = await prisma.survey.count({
      where: { userId }
    })

    if (surveyCount >= limits.maxSurveys) {
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
      const surveyCount = await prisma.survey.count({
        where: { userId }
      })
      
      if (surveyCount >= limits.maxSurveys) {
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

// プラン枠数のチェック
export async function checkPlanSlotLimit(userId: string, planType: string): Promise<{ allowed: boolean; message?: string; remainingSlots?: number }> {
  try {
    // ユーザーの該当プランの枠数を取得
    const planSlot = await prisma.userPlanSlot.findFirst({
      where: {
        userId,
        planType: planType as any,
        remainingSlots: { gt: 0 }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    })

    if (!planSlot) {
      return {
        allowed: false,
        message: `${planType}プランの枠がありません。プランを購入してください。`
      }
    }

    return {
      allowed: true,
      remainingSlots: planSlot.remainingSlots
    }
  } catch (error) {
    console.error('Error checking plan slot limit:', error)
    return {
      allowed: false,
      message: '枠数の確認中にエラーが発生しました'
    }
  }
}

// プラン枠の消費
export async function consumePlanSlot(userId: string, planType: string): Promise<{ success: boolean; message?: string }> {
  try {
    const planSlot = await prisma.userPlanSlot.findFirst({
      where: {
        userId,
        planType: planType as any,
        remainingSlots: { gt: 0 }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    })

    if (!planSlot) {
      return {
        success: false,
        message: `${planType}プランの枠がありません`
      }
    }

    // 枠数を1つ消費
    await prisma.userPlanSlot.update({
      where: { id: planSlot.id },
      data: {
        usedSlots: { increment: 1 },
        remainingSlots: { decrement: 1 }
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error consuming plan slot:', error)
    return {
      success: false,
      message: '枠数の消費中にエラーが発生しました'
    }
  }
}

export async function checkResponseLimit(surveyId: string): Promise<{ allowed: boolean; message?: string }> {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: { user: { include: { userPlan: true } } }
  })

  if (!survey || !survey.user.userPlan) {
    return { allowed: false, message: 'ユーザープランが見つかりません' }
  }

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
}

export async function checkExportFormat(userId: string, format: string): Promise<{ allowed: boolean; message?: string }> {
  const userPlan = await getUserPlan(userId)
  const limits = getPlanLimits(userPlan.planType)

  if (!limits.exportFormats.includes(format)) {
    return {
      allowed: false,
      message: `${format}形式のエクスポートは${userPlan.planType}プランでは利用できません。プランをアップグレードしてください。`
    }
  }

  return { allowed: true }
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
