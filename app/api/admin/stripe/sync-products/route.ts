import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定  
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type } = await request.json()

    if (type === 'plans') {
      // 基本プランの同期
      const { data: plans, error: plansError } = await supabase
        .from('PlanConfig')
        .select('*')
        .neq('planType', 'FREE')

      if (plansError) {
        console.error('Error fetching plans:', plansError)
        return NextResponse.json({ message: 'Failed to fetch plans' }, { status: 500 })
      }

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
          const { error: updateError } = await supabase
            .from('PlanConfig')
            .update({
              stripeProductId,
              stripePriceId
            })
            .eq('id', plan.id)

          if (updateError) {
            console.error('Error updating plan config:', updateError)
            throw new Error('Failed to update plan config')
          }

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
      const { data: addons, error: addonsError } = await supabase
        .from('DataStorageAddon')
        .select('*')
        .eq('isActive', true)

      if (addonsError) {
        console.error('Error fetching addons:', addonsError)
        return NextResponse.json({ message: 'Failed to fetch addons' }, { status: 500 })
      }

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
          const { error: addonUpdateError } = await supabase
            .from('DataStorageAddon')
            .update({
              stripeProductId,
              stripePriceId
            })
            .eq('id', addon.id)

          if (addonUpdateError) {
            console.error('Error updating data addon:', addonUpdateError)
            throw new Error('Failed to update data addon')
          }

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