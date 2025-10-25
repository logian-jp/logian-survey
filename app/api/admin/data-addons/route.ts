import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { isAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: addons, error: fetchError } = await supabase
      .from('DataStorageAddon')
      .select('*')
      .order('type', { ascending: true })
      .order('amount', { ascending: true })

    if (fetchError) {
      console.error('Error fetching data addons:', fetchError)
      return NextResponse.json({ message: 'Failed to fetch addons' }, { status: 500 })
    }

    return NextResponse.json(addons)
  } catch (error) {
    console.error('Error fetching data addons:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, type, amount, price, stripeProductId, stripePriceId, isActive, isMonthly } = body

    const { data: addon, error: createError } = await supabase
      .from('DataStorageAddon')
      .insert({
        name,
        description,
        type,
        amount,
        price,
        stripeProductId,
        stripePriceId,
        isActive: isActive !== undefined ? isActive : true,
        isMonthly: isMonthly !== undefined ? isMonthly : false
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating data addon:', createError)
      return NextResponse.json({ message: 'Failed to create addon' }, { status: 500 })
    }

    return NextResponse.json(addon)
  } catch (error) {
    console.error('Error creating data addon:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
