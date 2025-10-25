import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { getStripe } from '@/lib/stripe'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック（メールアドレスで判定）
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    if (!adminEmails.includes(session.user.email || '')) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const {
      planType,
      name,
      description,
      price,
      features,
      limits,
      isActive,
      sortOrder
    } = await request.json()

    // バリデーション
    if (!planType || !name || price === undefined) {
      return NextResponse.json(
        { message: 'Required fields are missing' },
        { status: 400 }
      )
    }

    const { id } = await params

    // プランタイプの重複チェック（自分以外）
    const { data: existingPlan, error: checkError } = await supabase
      .from('PlanConfig')
      .select('*')
      .eq('planType', planType)
      .neq('id', id)
      .single()

    if (!checkError && existingPlan) {
      return NextResponse.json(
        { message: 'Plan type already exists' },
        { status: 400 }
      )
    }

    // 既存のプラン設定を取得
    const { data: currentPlan, error: currentPlanError } = await supabase
      .from('PlanConfig')
      .select('*')
      .eq('id', id)
      .single()

    if (currentPlanError || !currentPlan) {
      return NextResponse.json(
        { message: 'Plan config not found' },
        { status: 404 }
      )
    }

    // データベースを更新
    const { data: planConfig, error: updateError } = await supabase
      .from('PlanConfig')
      .update({
        planType,
        name,
        description,
        price,
        features,
        limits,
        isActive,
        sortOrder
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating plan config:', updateError)
      return NextResponse.json({ message: 'Failed to update plan config' }, { status: 500 })
    }

    // Stripe商品・価格の更新
    try {
      if (currentPlan.stripeProductId) {
        // 既存のStripe商品を更新
        const updateData: any = {
          name: planConfig.name,
          metadata: {
            planType: planConfig.planType,
            planConfigId: planConfig.id
          }
        }
        
        // descriptionが空でない場合のみ追加
        if (planConfig.description && planConfig.description.trim() !== '') {
          updateData.description = planConfig.description
        }
        
        await getStripe().products.update(currentPlan.stripeProductId, updateData)

        // 価格が変更された場合は新しい価格を作成
        if (currentPlan.price !== planConfig.price) {
          const newPrice = await getStripe().prices.create({
            product: currentPlan.stripeProductId,
            unit_amount: Math.round(planConfig.price),
            currency: 'jpy',
            recurring: planConfig.planType === 'ONETIME_UNLIMITED' ? undefined : {
              interval: 'month'
            },
            metadata: {
              planType: planConfig.planType,
              planConfigId: planConfig.id
            }
          })

          // 古い価格を非アクティブ化
          if (currentPlan.stripePriceId) {
            await getStripe().prices.update(currentPlan.stripePriceId, {
              active: false
            })
          }

          // データベースに新しい価格IDを保存
          const { error: priceUpdateError } = await supabase
            .from('PlanConfig')
            .update({ stripePriceId: newPrice.id })
            .eq('id', id)

          if (priceUpdateError) {
            console.error('Error updating price ID:', priceUpdateError)
          }
        }
      } else {
        // Stripe商品が存在しない場合は作成
        const productData: any = {
          name: planConfig.name,
          metadata: {
            planType: planConfig.planType,
            planConfigId: planConfig.id
          }
        }
        
        // descriptionが空でない場合のみ追加
        if (planConfig.description && planConfig.description.trim() !== '') {
          productData.description = planConfig.description
        }
        
        const product = await getStripe().products.create(productData)

        const price = await getStripe().prices.create({
          product: product.id,
          unit_amount: Math.round(planConfig.price),
          currency: 'jpy',
          recurring: planConfig.planType === 'ONETIME_UNLIMITED' ? undefined : {
            interval: 'month'
          },
          metadata: {
            planType: planConfig.planType,
            planConfigId: planConfig.id
          }
        })

        // データベースにStripe情報を保存
        const { error: stripeUpdateError } = await supabase
          .from('PlanConfig')
          .update({
            stripeProductId: product.id,
            stripePriceId: price.id
          })
          .eq('id', id)

        if (stripeUpdateError) {
          console.error('Error updating Stripe info:', stripeUpdateError)
        }
      }
    } catch (stripeError) {
      console.error('Stripe update error:', stripeError)
      // Stripeエラーが発生してもデータベースの更新は成功とする
    }

    return NextResponse.json(planConfig)
  } catch (error) {
    console.error('Failed to update plan config:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック（メールアドレスで判定）
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    if (!adminEmails.includes(session.user.email || '')) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const { error: deleteError } = await supabase
      .from('PlanConfig')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting plan config:', deleteError)
      return NextResponse.json({ message: 'Failed to delete plan config' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Plan config deleted successfully' })
  } catch (error) {
    console.error('Failed to delete plan config:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
