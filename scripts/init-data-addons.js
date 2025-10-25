// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function initDataAddons() {
  try {
    console.log('Initializing data addons...')
    
    // 既存のデータアドオンをクリア
    await prisma.dataStorageAddon.deleteMany({})
    console.log('Cleared existing data addons')
    
    // データアドオンを作成
    const addons = [
      // 容量追加（月額）
      {
        name: '100MB容量追加（月額）',
        description: '月額で100MBの容量を追加します',
        type: 'storage',
        amount: 100,
        price: 120,
        isActive: true,
        isMonthly: true
      },
      {
        name: '500MB容量追加（月額）',
        description: '月額で500MBの容量を追加します',
        type: 'storage',
        amount: 500,
        price: 500,
        isActive: true,
        isMonthly: true
      },
      {
        name: '1GB容量追加（月額）',
        description: '月額で1GBの容量を追加します',
        type: 'storage',
        amount: 1000,
        price: 900,
        isActive: true,
        isMonthly: true
      },
      {
        name: '2GB容量追加（月額）',
        description: '月額で2GBの容量を追加します',
        type: 'storage',
        amount: 2000,
        price: 1600,
        isActive: true,
        isMonthly: true
      },
      
      
      // 保存期間延長（買い切り）
      {
        name: '30日保存期間延長',
        description: 'データの保存期間を30日延長します',
        type: 'retention',
        amount: 30,
        price: 500,
        isActive: true,
        isMonthly: false
      },
      {
        name: '90日保存期間延長',
        description: 'データの保存期間を90日延長します',
        type: 'retention',
        amount: 90,
        price: 1200,
        isActive: true,
        isMonthly: false
      },
      {
        name: '180日保存期間延長',
        description: 'データの保存期間を180日延長します',
        type: 'retention',
        amount: 180,
        price: 2000,
        isActive: true,
        isMonthly: false
      },
      {
        name: '365日保存期間延長',
        description: 'データの保存期間を365日延長します',
        type: 'retention',
        amount: 365,
        price: 3500,
        isActive: true,
        isMonthly: false
      }
    ]
    
    for (const addon of addons) {
      await prisma.dataStorageAddon.create({
        data: addon
      })
    }
    
    console.log(`Created ${addons.length} data addons`)
    console.log('Data addons initialization completed!')
  } catch (error) {
    console.error('Error initializing data addons:', error)
  } finally {
    await prisma.$disconnect()
  }
}

initDataAddons()
