import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
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
    const { data: discountLinks, error: linkError } = await supabase
      .from('DiscountLink')
      .select(`
        *,
        creator:User!createdBy(id, name, email)
      `)
      .eq('id', id)
      .single()

    if (linkError) {
      console.error('Error fetching discount link:', linkError)
      return NextResponse.json({ message: 'Failed to fetch discount link' }, { status: 500 })
    }

    const discountLink = discountLinks

    if (!discountLink) {
      return NextResponse.json({ message: 'Discount link not found' }, { status: 404 })
    }

    return NextResponse.json(discountLink)
  } catch (error) {
    console.error('Failed to fetch discount link:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { isActive } = await request.json()

    const { data: discountLink, error: updateError } = await supabase
      .from('DiscountLink')
      .update({ isActive })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating discount link:', updateError)
      return NextResponse.json({ message: 'Failed to update discount link' }, { status: 500 })
    }

    return NextResponse.json(discountLink)
  } catch (error) {
    console.error('Failed to update discount link:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
