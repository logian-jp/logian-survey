// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initInvitationFields() {
  try {
    console.log('初期化開始: 招待制フィールドの設定...')

    // 既存のユーザーに招待制フィールドのデフォルト値を設定
    const result = await prisma.user.updateMany({
      data: {
        maxInvitations: 3,
        usedInvitations: 0
      }
    })

    console.log(`${result.count} 人のユーザーの招待制フィールドを初期化しました`)

    // 管理者ユーザーにはより多くの招待権限を与える
    await prisma.user.updateMany({
      where: {
        role: 'ADMIN'
      },
      data: {
        maxInvitations: 10
      }
    })

    console.log('管理者ユーザーに10人の招待権限を付与しました')

    console.log('初期化完了!')
  } catch (error) {
    console.error('初期化エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initInvitationFields()
