// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateExistingSurveys() {
  try {
    console.log('既存のアンケートの作成者をSurveyUserテーブルに追加中...')

    // 既存のアンケートを取得
    const surveys = await prisma.survey.findMany({
      include: {
        surveyUsers: true
      }
    })

    console.log(`${surveys.length}件のアンケートが見つかりました`)

    for (const survey of surveys) {
      // 作成者がSurveyUserテーブルに存在しない場合のみ追加
      const hasOwnerInSurveyUsers = survey.surveyUsers.some(su => su.userId === survey.userId)
      if (!hasOwnerInSurveyUsers) {
        await prisma.surveyUser.create({
          data: {
            userId: survey.userId,
            surveyId: survey.id,
            permission: 'ADMIN',
            invitedBy: survey.userId,
            acceptedAt: new Date(),
          },
        })
        console.log(`アンケート "${survey.title}" の作成者を管理者権限で追加しました`)
      } else {
        console.log(`アンケート "${survey.title}" は既に設定済みです`)
      }
    }

    console.log('マイグレーションが完了しました！')
  } catch (error) {
    console.error('マイグレーション中にエラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateExistingSurveys()
