import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限のチェック
    if (session.user.email !== 'noutomi0729@gmail.com') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    console.log('=== Debug Discount Links ===')
    
    // 割引リンクを取得 (Supabase SDK使用)
    const { data: discountLinks, error: discountError } = await supabase
      .from('DiscountLink')
      .select('id, code, name, isActive, validFrom, validUntil, createdAt, updatedAt')
      .order('createdAt', { ascending: false })

    if (discountError) {
      console.error('Error fetching discount links:', discountError)
      return NextResponse.json({ error: 'Failed to fetch discount links' }, { status: 500 })
    }

    console.log('Found discount links:', discountLinks.length)
    discountLinks.forEach(link => {
      console.log(`- ${link.code}: isActive=${link.isActive}, validFrom=${link.validFrom}, validUntil=${link.validUntil}`)
    })

    return NextResponse.json({
      count: discountLinks.length,
      links: discountLinks
    })
  } catch (error) {
    console.error('Debug discount links error:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
