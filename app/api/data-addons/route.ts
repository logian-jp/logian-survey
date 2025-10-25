import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'storage' または 'retention'

    // データアドオンを取得 (Supabase SDK使用)
    let query = supabase
      .from('DataStorageAddon')
      .select('*')
      .eq('isActive', true)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: addons, error: addonsError } = await query
      .order('type', { ascending: true })
      .order('amount', { ascending: true })

    if (addonsError) {
      console.error('Error fetching data addons:', addonsError)
      return NextResponse.json({ error: 'Failed to fetch data addons' }, { status: 500 })
    }

    return NextResponse.json(addons)
  } catch (error) {
    console.error('Error fetching data addons:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
