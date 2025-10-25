// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initPlanSlots() {
  try {
    console.log('Initializing plan slots for existing users...')

    // 全ユーザーを取得
    const users = await prisma.user.findMany({
      include: {
        userPlan: true
      }
    })

    console.log(`Found ${users.length} users`)

    for (const user of users) {
      if (!user.userPlan) {
        console.log(`User ${user.email} has no plan, skipping...`)
        continue
      }

      const planType = user.userPlan.planType
      console.log(`Processing user ${user.email} with plan ${planType}`)

      // 既存の枠数をチェック
      const existingSlots = await prisma.userPlanSlot.findMany({
        where: {
          userId: user.id,
          planType: planType
        }
      })

      if (existingSlots.length > 0) {
        console.log(`User ${user.email} already has slots for ${planType}, skipping...`)
        continue
      }

      // プラン別の枠数を設定
      const slotCount = getSlotCountForPlan(planType)
      if (slotCount > 0) {
        await prisma.userPlanSlot.create({
          data: {
            userId: user.id,
            planType: planType,
            totalSlots: slotCount,
            usedSlots: 0,
            remainingSlots: slotCount,
            expiresAt: null // 永続
          }
        })
        console.log(`Created ${slotCount} slots for user ${user.email} (${planType})`)
      }
    }

    console.log('Plan slots initialization completed!')
  } catch (error) {
    console.error('Error initializing plan slots:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function getSlotCountForPlan(planType) {
  const slotMap = {
    'FREE': 3,           // 無料プラン: 3枠
    'STANDARD': 1,        // スタンダード: 1枠
    'PROFESSIONAL': 1,    // プロフェッショナル: 1枠
    'ENTERPRISE': 1,      // エンタープライズ: 1枠
    'ONETIME_UNLIMITED': 1 // 無制限: 1枠
  }
  
  return slotMap[planType] || 0
}

initPlanSlots()

