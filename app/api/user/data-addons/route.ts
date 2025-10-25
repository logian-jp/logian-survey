import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userAddons = await prisma.userDataAddon.findMany({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      },
      include: {
        addon: true
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    })

    return NextResponse.json(userAddons)
  } catch (error) {
    console.error('Error fetching user data addons:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
