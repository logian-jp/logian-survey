import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    console.log('Supabase client available:', !!supabase)

    try {
      const { data: planConfigs, error: fetchError } = await supabase
        .from('PlanConfig')
        .select('*')
        .order('sortOrder', { ascending: true })

      if (fetchError) {
        console.error('Error fetching plan configs:', fetchError)
        return NextResponse.json({ message: 'Failed to fetch plan configs' }, { status: 500 })
      }

      console.log('Found plan configs:', planConfigs?.length || 0)
      return NextResponse.json(planConfigs || [])
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
    const { data: existingPlan, error: checkError } = await supabase
      .from('PlanConfig')
      .select('*')
      .eq('planType', planType)
      .single()

    if (!checkError && existingPlan) {
      return NextResponse.json(
        { message: 'Plan type already exists' },
        { status: 400 }
      )
    }

    const { data: planConfig, error: createError } = await supabase
      .from('PlanConfig')
      .insert({
        planType,
        name,
        description,
        price,
        features,
        limits,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating plan config:', createError)
      return NextResponse.json({ message: 'Failed to create plan config' }, { status: 500 })
    }

    return NextResponse.json(planConfig)
  } catch (error) {
    console.error('Failed to create plan config:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
