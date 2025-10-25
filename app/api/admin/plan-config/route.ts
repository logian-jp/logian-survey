import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック（メールアドレスで判定）
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    // Prismaクライアントの確認
    if (!prisma) {
      console.error('Prisma client is not initialized')
      return NextResponse.json({ message: 'Database connection error' }, { status: 500 })
    }

    console.log('Prisma client available:', !!prisma)
    console.log('PlanConfig model available:', !!prisma.planConfig)

    try {
      const planConfigs = await prisma.planConfig.findMany({
        orderBy: {
          sortOrder: 'asc'
        }
      })

      console.log('Found plan configs:', planConfigs.length)
      return NextResponse.json(planConfigs)
    } catch (error: any) {
      if (error.code === 'P2021') {
        // テーブルが存在しない場合、空の配列を返す
        console.log('PlanConfig table does not exist, returning empty array')
        return NextResponse.json([])
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to fetch plan configs:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック（メールアドレスで判定）
    if (session.user.role !== 'ADMIN') {
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

    // プランタイプの重複チェック
    const existingPlan = await prisma.planConfig.findUnique({
      where: { planType }
    })

    if (existingPlan) {
      return NextResponse.json(
        { message: 'Plan type already exists' },
        { status: 400 }
      )
    }

    const planConfig = await prisma.planConfig.create({
      data: {
        planType,
        name,
        description,
        price,
        features,
        limits,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0
      }
    })

    return NextResponse.json(planConfig)
  } catch (error) {
    console.error('Failed to create plan config:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
