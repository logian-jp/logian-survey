// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateToOnetimePlans() {
  try {
    console.log('単発プランへの移行を開始します...')

    // 1. 既存のプラン設定を削除
    console.log('既存のプラン設定を削除中...')
    await prisma.planConfig.deleteMany({})

    // 2. 新しい単発プラン設定を作成
    console.log('新しい単発プラン設定を作成中...')
    const newPlans = [
      {
        planType: 'FREE',
        name: '無料プラン',
        description: '個人利用に最適',
        price: 0,
        features: [
          '100回答まで',
          '初回回答から1週間の期限',
          '条件分岐付き',
          'データ保存30日',
          '通常データでの書き出しのみ'
        ],
        limits: {
          maxSurveys: 1,
          maxResponsesPerSurvey: 100,
          exportFormats: ['raw'],
          surveyDurationDays: 7,
          dataRetentionDays: 30,
          maxDataSizeMB: 100
        },
        isActive: true,
        sortOrder: 1
      },
      {
        planType: 'BASIC',
        name: 'ベーシックプラン',
        description: '小規模調査に最適',
        price: 3000,
        features: [
          '100回答まで',
          '初回回答から1ヶ月の期限',
          '条件分岐付き',
          'データ保存30日',
          '通常データでの書き出しのみ'
        ],
        limits: {
          maxSurveys: 1,
          maxResponsesPerSurvey: 100,
          exportFormats: ['raw'],
          surveyDurationDays: 30,
          dataRetentionDays: 30,
          maxDataSizeMB: 500
        },
        isActive: true,
        sortOrder: 2
      },
      {
        planType: 'STANDARD',
        name: 'スタンダードプラン',
        description: '本格的な調査に最適',
        price: 10000,
        features: [
          '500回答まで',
          '初回回答から1ヶ月の期限',
          '条件分岐付き',
          'データ保存180日',
          '正規化・標準化データ書き出し',
          '変数名英語変換',
          'API連携可能'
        ],
        limits: {
          maxSurveys: 1,
          maxResponsesPerSurvey: 500,
          exportFormats: ['raw', 'normalized', 'standardized'],
          surveyDurationDays: 30,
          dataRetentionDays: 180,
          maxDataSizeMB: 2000
        },
        isActive: true,
        sortOrder: 3
      },
      {
        planType: 'PREMIUM',
        name: 'プレミアムプラン',
        description: '大規模調査・エンタープライズ向け',
        price: 50000,
        features: [
          '回答数無制限',
          '初回回答から1ヶ月の期限',
          '条件分岐付き',
          'データ保存365日',
          '正規化・標準化データ書き出し',
          '変数名英語変換',
          'オリジナルロゴ設定',
          'カスタムドメイン設定',
          'API連携可能',
          '優先サポート'
        ],
        limits: {
          maxSurveys: 1,
          maxResponsesPerSurvey: -1,
          exportFormats: ['raw', 'normalized', 'standardized'],
          surveyDurationDays: 30,
          dataRetentionDays: 365,
          maxDataSizeMB: -1
        },
        isActive: true,
        sortOrder: 4
      }
    ]

    for (const plan of newPlans) {
      await prisma.planConfig.create({
        data: plan
      })
      console.log(`プラン ${plan.name} を作成しました`)
    }

    // 3. 既存のユーザーのプランを無料プランにリセット
    console.log('既存ユーザーのプランを無料プランにリセット中...')
    await prisma.userPlan.updateMany({
      data: {
        planType: 'FREE',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: null
      }
    })

    // 4. 既存のアンケートに期限設定を追加
    console.log('既存のアンケートに期限設定を追加中...')
    const surveys = await prisma.survey.findMany({
      where: {
        status: 'ACTIVE'
      }
    })

    for (const survey of surveys) {
      const userPlan = await prisma.userPlan.findUnique({
        where: { userId: survey.userId }
      })

      if (userPlan) {
        const planLimits = newPlans.find(p => p.planType === userPlan.planType)?.limits
        if (planLimits) {
          await prisma.survey.update({
            where: { id: survey.id },
            data: {
              endDate: new Date(Date.now() + (planLimits.surveyDurationDays * 24 * 60 * 60 * 1000)),
              surveyEndDate: new Date(Date.now() + (planLimits.surveyDurationDays * 24 * 60 * 60 * 1000)),
              dataRetentionDays: planLimits.dataRetentionDays
            }
          })
        }
      }
    }

    console.log('単発プランへの移行が完了しました！')
    console.log('作成されたプラン:')
    newPlans.forEach(plan => {
      console.log(`- ${plan.name}: ¥${plan.price.toLocaleString()}/回`)
    })

  } catch (error) {
    console.error('移行中にエラーが発生しました:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  migrateToOnetimePlans()
    .then(() => {
      console.log('移行が正常に完了しました')
      process.exit(0)
    })
    .catch((error) => {
      console.error('移行に失敗しました:', error)
      process.exit(1)
    })
}

module.exports = { migrateToOnetimePlans }
