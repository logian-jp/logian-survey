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

  const responseCount = await prisma.response.count({
    where: { surveyId }
  })

  if (responseCount >= limits.maxResponsesPerSurvey) {
    return {
      allowed: false,
      message: `回答数の上限（${limits.maxResponsesPerSurvey}件）に達しています。プランをアップグレードしてください。`
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
