import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await request.json()

    if (type === 'plans') {
      // 基本プランの同期
      const plans = await prisma.planConfig.findMany({
        where: {
          planType: {
            not: 'FREE'
          }
        }
      })

      const results = []
      for (const plan of plans) {
        try {
          // Stripe商品を作成または取得
          const productName = `Logian Survey - ${plan.planType}`
          let stripeProductId = plan.stripeProductId

          if (!stripeProductId) {
            const product = await getStripe().products.create({
              name: productName,
              description: plan.description || `${plan.planType}プラン`,
              metadata: {
                planType: plan.planType
              }
            })
            stripeProductId = product.id
          }

          // Stripe価格を作成または取得
          let stripePriceId = plan.stripePriceId

          if (!stripePriceId && plan.price > 0) {
            const price = await getStripe().prices.create({
              product: stripeProductId,
              unit_amount: plan.price,
              currency: 'jpy',
              recurring: plan.planType !== 'ONETIME_UNLIMITED' ? {
                interval: 'month'
              } : undefined,
              metadata: {
                planType: plan.planType
              }
            })
            stripePriceId = price.id
          }

          // データベースを更新
          await prisma.planConfig.update({
            where: { id: plan.id },
            data: {
              stripeProductId,
              stripePriceId
            }
          })

          results.push({
            planType: plan.planType,
            stripeProductId,
            stripePriceId,
            status: 'success'
          })
        } catch (error) {
          console.error(`Error syncing plan ${plan.planType}:`, error)
          results.push({
            planType: plan.planType,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({ results })
    }

    if (type === 'addons') {
      // データアドオンの同期
      const addons = await prisma.dataStorageAddon.findMany({
        where: {
          isActive: true
        }
      })

      const results = []
      for (const addon of addons) {
        try {
          let stripeProductId = addon.stripeProductId
          let stripePriceId = addon.stripePriceId

          // Stripe商品を作成または取得
          if (!stripeProductId) {
            const product = await getStripe().products.create({
              name: addon.name,
              description: addon.description || `${addon.type === 'storage' ? '容量追加' : '保存期間延長'}`,
              metadata: {
                addonId: addon.id,
                type: addon.type
              }
            })
            stripeProductId = product.id
          }

          // 月額プランの場合のみ価格を作成
          if (addon.isMonthly && !stripePriceId) {
            const price = await getStripe().prices.create({
              product: stripeProductId,
              unit_amount: addon.price,
              currency: 'jpy',
              recurring: {
                interval: 'month'
              },
              metadata: {
                addonId: addon.id,
                type: addon.type
              }
            })
            stripePriceId = price.id
          }

          // データベースを更新
          await prisma.dataStorageAddon.update({
            where: { id: addon.id },
            data: {
              stripeProductId,
              stripePriceId
            }
          })

          results.push({
            addonId: addon.id,
            addonName: addon.name,
            stripeProductId,
            stripePriceId,
            status: 'success'
          })
        } catch (error) {
          console.error(`Error syncing addon ${addon.name}:`, error)
          results.push({
            addonId: addon.id,
            addonName: addon.name,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      return NextResponse.json({ results })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Error syncing Stripe products:', error)
    return NextResponse.json(
      { error: 'Failed to sync Stripe products' },
      { status: 500 }
    )
  }
}