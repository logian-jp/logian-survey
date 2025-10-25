import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { TICKET_LIMITS } from '@/lib/ticket-check'

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

    console.log('Fetching discount links...')

    try {
      const { data: discountLinks, error: linksError } = await supabase
        .from('DiscountLink')
        .select(`
          *,
          creator:User!createdBy(id, name, email)
        `)
        .order('createdAt', { ascending: false })

      if (linksError) {
        console.error('Error fetching discount links:', linksError)
        return NextResponse.json({ message: 'Failed to fetch discount links' }, { status: 500 })
      }

      console.log('Found discount links:', discountLinks.length)
      discountLinks.forEach(link => {
        console.log(`- ${link.code}: isActive=${link.isActive}, validFrom=${link.validFrom}, validUntil=${link.validUntil}`)
      })
      return NextResponse.json(discountLinks)
    } catch (error: any) {
      if (error.code === 'P2022') {
        // カラムが存在しない場合、古いスキーマで取得
        console.log('New columns do not exist, using old schema')
        const { data: fallbackLinks, error: fallbackError } = await supabase
          .from('DiscountLink')
          .select('*')
          .order('createdAt', { ascending: false })

        if (fallbackError) {
          console.error('Error fetching fallback discount links:', fallbackError)
          throw fallbackError
        }

        return NextResponse.json(fallbackLinks)
      }
      throw error
    }
  } catch (error) {
    console.error('Failed to fetch discount links:', error)
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

    console.log('Supabase client available:', !!supabase)

      const {
        name,
        code,
        description,
        discountType,
        discountValue,
        targetTicketType,
        maxUses,
        validFrom,
        validUntil,
        subscriptionDiscountMonths,
        totalSavings
      } = await request.json()

    // バリデーション
    if (!name || !code || !discountType || !discountValue || !targetTicketType || !validFrom || !validUntil) {
      return NextResponse.json(
        { message: 'Required fields are missing' },
        { status: 400 }
      )
    }

    // チケットタイプが存在するかチェック
    if (!TICKET_LIMITS[targetTicketType as keyof typeof TICKET_LIMITS]) {
      return NextResponse.json(
        { message: 'Invalid ticket type' },
        { status: 400 }
      )
    }

    // 割引率のバリデーション
    if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { message: 'Discount percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    // 元の価格を取得
    const originalPrice = TICKET_LIMITS[targetTicketType as keyof typeof TICKET_LIMITS].price

    // 割引後価格を計算
    let discountedPrice: number
    if (discountType === 'PERCENTAGE') {
      discountedPrice = originalPrice * (1 - discountValue / 100)
    } else {
      discountedPrice = Math.max(0, originalPrice - discountValue)
    }

    // コードの重複チェック
    const { data: existingLink, error: linkError } = await supabase
      .from('DiscountLink')
      .select('*')
      .eq('code', code)
      .single()
    
    if (!linkError && existingLink) {
      return NextResponse.json(
        { message: 'This discount code already exists' },
        { status: 400 }
      )
    }

    // ユーザーをメールアドレスで検索して正しいIDを取得
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('email', session.user.email!)
      .single()

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Creating discount link with data:', {
      code,
      name,
      description,
      discountType,
      discountValue,
      targetTicketType,
      originalPrice,
      discountedPrice,
      maxUses,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      createdBy: user.id,
      createdByEmail: user.email
    })

    const { data: discountLink, error: createError } = await supabase
      .from('DiscountLink')
      .insert({
        code,
        name,
        description,
        discountType,
        discountValue,
        targetTicketType,
        originalPrice,
        discountedPrice,
        maxUses: maxUses || null,
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
        subscriptionDiscountMonths: subscriptionDiscountMonths || null,
        totalSavings: totalSavings || null,
        createdBy: user.id,
        createdByEmail: user.email
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating discount link:', createError)
      return NextResponse.json({ message: 'Failed to create discount link' }, { status: 500 })
    }

    console.log('Created discount link:', {
      id: discountLink.id,
      code: discountLink.code,
      name: discountLink.name,
      createdBy: discountLink.createdBy,
      createdAt: discountLink.createdAt
    })

    return NextResponse.json(discountLink)
  } catch (error) {
    console.error('Failed to create discount link:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
