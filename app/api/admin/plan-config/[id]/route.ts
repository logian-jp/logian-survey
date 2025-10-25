import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

    // プランタイプの重複チェック（自分以外）
    const existingPlan = await prisma.planConfig.findFirst({
      where: {
        planType,
        id: { not: (await params).id }
      }
    })

    if (existingPlan) {
      return NextResponse.json(
        { message: 'Plan type already exists' },
        { status: 400 }
      )
    }

    // 既存のプラン設定を取得
    const currentPlan = await prisma.planConfig.findUnique({
      where: { id: (await params).id }
    })

    if (!currentPlan) {
      return NextResponse.json(
        { message: 'Plan config not found' },
        { status: 404 }
      )
    }

    // データベースを更新
    const planConfig = await prisma.planConfig.update({
      where: { id: (await params).id },
      data: {
        planType,
        name,
        description,
        price,
        features,
        limits,
        isActive,
        sortOrder
      }
    })

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
          await prisma.planConfig.update({
            where: { id: (await params).id },
            data: { stripePriceId: newPrice.id }
          })
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
        await prisma.planConfig.update({
          where: { id: (await params).id },
          data: {
            stripeProductId: product.id,
            stripePriceId: price.id
          }
        })
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

    await prisma.planConfig.delete({
      where: { id: (await params).id }
    })

    return NextResponse.json({ message: 'Plan config deleted successfully' })
  } catch (error) {
    console.error('Failed to delete plan config:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
