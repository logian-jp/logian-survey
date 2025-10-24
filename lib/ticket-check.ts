import { prisma } from '@/lib/prisma'
import { getPlanLimits } from '@/lib/plan-limits'

// チケット制限の定義（プラン制限と同じ構造を使用）
export const TICKET_LIMITS = {
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
      'file_upload'
      // YouTube埋め込み不可（video_embedding を含めない）
    ],
    price: 2980,
    surveyDurationDays: 90,
    dataRetentionDays: 90,
    maxDataSizeMB: -1
  },
  PROFESSIONAL: {
    maxSurveys: -1,
    maxResponsesPerSurvey: 1000,
    exportFormats: ['raw', 'normalized', 'standardized'],
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
    exportFormats: ['raw', 'normalized', 'standardized'],
    features: [
      'all_question_types',
      'conditional_logic',
      'file_upload',
      'video_embedding',
      'normalized_export',
      'standardized_export',
      'api_integration', // Webhook/API連携可
      'priority_support',
      'enterprise_rewards', // PayPayポイントスキーム・API発行のプレースホルダ
      'custom_logo', // カスタムロゴ
      'header_image', // ヘッダー画像
      'custom_domain' // カスタムドメイン
    ],
    price: 50000,
    surveyDurationDays: 180,
    dataRetentionDays: 360,
    maxDataSizeMB: -1
  }
}

export function getTicketLimits(ticketType: string) {
  return TICKET_LIMITS[ticketType as keyof typeof TICKET_LIMITS] || TICKET_LIMITS.FREE
}

// チケット機能チェック
export function checkTicketFeature(ticketType: string, feature: string): boolean {
  const limits = getTicketLimits(ticketType)
  return limits.features.includes(feature)
}

// YouTube埋め込み可否チェック
export function canUseVideoEmbedding(ticketType: string): boolean {
  return checkTicketFeature(ticketType, 'video_embedding')
}

// カスタムロゴ可否チェック
export function canUseCustomLogo(ticketType: string): boolean {
  return checkTicketFeature(ticketType, 'custom_logo')
}

// ヘッダー画像可否チェック
export function canUseHeaderImage(ticketType: string): boolean {
  return checkTicketFeature(ticketType, 'header_image')
}

// カスタムドメイン可否チェック
export function canUseCustomDomain(ticketType: string): boolean {
  return checkTicketFeature(ticketType, 'custom_domain')
}

// API連携可否チェック
export function canUseApiIntegration(ticketType: string): boolean {
  return checkTicketFeature(ticketType, 'api_integration')
}

// エクスポート形式チェック
export function checkExportFormat(ticketType: string, format: string): boolean {
  const limits = getTicketLimits(ticketType)
  return limits.exportFormats.includes(format)
}

// アンケートのチケットタイプを取得
export async function getSurveyTicketType(surveyId: string): Promise<string> {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      select: { ticketType: true }
    })
    return survey?.ticketType || 'FREE'
  } catch (error) {
    console.error('Failed to get survey ticket type:', error)
    return 'FREE'
  }
}

// ユーザーのチケット数を取得
export async function getUserTicketCount(userId: string, ticketType: string): Promise<number> {
  try {
    const userTicket = await (prisma as any).userTicket.findFirst({
      where: {
        userId,
        ticketType
      }
    })
    return userTicket ? userTicket.remainingTickets : 0
  } catch (error) {
    console.error('Failed to get user ticket count:', error)
    return 0
  }
}

// チケット機能制限チェック（API用）
export async function checkTicketFeatureRestriction(
  surveyId: string, 
  feature: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    const ticketType = await getSurveyTicketType(surveyId)
    
    if (!checkTicketFeature(ticketType, feature)) {
      const ticketName = {
        'FREE': '無料チケット',
        'STANDARD': 'スタンダードチケット',
        'PROFESSIONAL': 'プロフェッショナルチケット',
        'ENTERPRISE': 'エンタープライズチケット'
      }[ticketType] || '無料チケット'
      
      return {
        allowed: false,
        message: `この機能は${ticketName}では利用できません。エンタープライズチケットを購入してください。`
      }
    }
    
    return { allowed: true }
  } catch (error) {
    console.error('Failed to check ticket feature restriction:', error)
    return {
      allowed: false,
      message: '機能制限の確認中にエラーが発生しました'
    }
  }
}
