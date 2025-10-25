import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type SurveyPermission = 'EDIT' | 'VIEW' | 'ADMIN'

export interface SurveyAccess {
  canView: boolean
  canEdit: boolean
  canAdmin: boolean
  isOwner: boolean
}

/**
 * ユーザーがアンケートに対して持つ権限をチェック
 */
export async function checkSurveyPermissions(
  userId: string,
  surveyId: string
): Promise<SurveyAccess> {
  try {
    // アンケートとユーザー権限を取得 (Supabase SDK使用)
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select(`
        *,
        surveyUsers:SurveyUser(permission)
      `)
      .eq('id', surveyId)
      .eq('surveyUsers.userId', userId)
      .single()

    if (surveyError || !survey) {
      console.error('Survey not found:', surveyError)
      return {
        canView: false,
        canEdit: false,
        canAdmin: false,
        isOwner: false
      }
    }

    const isOwner = survey.userId === userId
    const userPermission = survey.surveyUsers?.[0]?.permission

    // 作成者の場合は常に全権限を持つ
    if (isOwner) {
      return {
        canView: true,
        canEdit: true,
        canAdmin: true,
        isOwner: true
      }
    }

    return {
      canView: !!userPermission,
      canEdit: userPermission === 'EDIT' || userPermission === 'ADMIN',
      canAdmin: userPermission === 'ADMIN',
      isOwner: false
    }
  } catch (error) {
    console.error('Error checking survey permissions:', error)
    return {
      canView: false,
      canEdit: false,
      canAdmin: false,
      isOwner: false
    }
  }
}

/**
 * ユーザーがアンケートを編集できるかチェック
 */
export async function canEditSurvey(userId: string, surveyId: string): Promise<boolean> {
  const permissions = await checkSurveyPermissions(userId, surveyId)
  return permissions.canEdit
}

/**
 * ユーザーがアンケートを管理できるかチェック
 */
export async function canAdminSurvey(userId: string, surveyId: string): Promise<boolean> {
  const permissions = await checkSurveyPermissions(userId, surveyId)
  return permissions.canAdmin
}

/**
 * ユーザーがアンケートを閲覧できるかチェック
 */
export async function canViewSurvey(userId: string, surveyId: string):Promise<boolean> {
  const permissions = await checkSurveyPermissions(userId, surveyId)
  return permissions.canView
}
