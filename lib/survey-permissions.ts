import { prisma } from './prisma'

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
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        surveyUsers: {
          where: { userId },
          select: { permission: true }
        }
      }
    })

    if (!survey) {
      return {
        canView: false,
        canEdit: false,
        canAdmin: false,
        isOwner: false
      }
    }

    const isOwner = survey.userId === userId
    const userPermission = survey.surveyUsers[0]?.permission

    return {
      canView: isOwner || !!userPermission,
      canEdit: isOwner || userPermission === 'EDIT' || userPermission === 'ADMIN',
      canAdmin: isOwner || userPermission === 'ADMIN',
      isOwner
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
