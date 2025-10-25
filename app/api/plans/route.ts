import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // 一般ユーザーがアクセス可能なプラン設定を取得 (Supabase SDK使用)
    const { data: planConfigs, error: plansError } = await supabase
      .from('PlanConfig')
      .select('*')
      .eq('isActive', true)
      .order('sortOrder', { ascending: true })

    if (plansError) {
      console.error('Error fetching plan configs:', plansError)
      return NextResponse.json({ message: 'Failed to fetch plan configurations' }, { status: 500 })
    }

    return NextResponse.json(planConfigs)
  } catch (error) {
    console.error('Failed to fetch plan configs:', error)
    return NextResponse.json(
      { message: 'Failed to fetch plan configurations' },
      { status: 500 }
    )
  }
}