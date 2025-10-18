import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { planType, paymentMethod, amount } = await request.json()

    if (!planType) {
      return NextResponse.json(
        { message: 'Plan type is required' },
        { status: 400 }
      )
    }

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Session user ID:', session.user.id)
    console.log('Found user ID:', user.id)
    console.log(`Processing payment: ${planType} - ¥${amount} - ${paymentMethod}`)
    
    // 実際のStripe連携は後で実装
    // ここでは単純にプランを更新
    let userPlan;
    try {
      userPlan = await prisma.userPlan.upsert({
        where: { userId: user.id },
        update: {
          planType: planType,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null // サブスクリプションの場合は適切な終了日を設定
        },
        create: {
          userId: user.id,
          planType: planType,
          status: 'ACTIVE',
          startDate: new Date()
        }
      })
      
      console.log('User plan updated successfully:', userPlan)
    } catch (error) {
      console.error('Failed to update user plan:', error)
      return NextResponse.json(
        { message: 'Failed to update user plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Plan upgraded successfully',
      userPlan
    })
  } catch (error) {
    console.error('Failed to upgrade plan:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
