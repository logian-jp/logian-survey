import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserDataUsage } from '@/lib/plan-limits'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    // ユーザーのデータ使用量を取得
    const totalUsage = await getUserDataUsage(userId)

    // データ種別別の使用量を取得
    const usageByType = await prisma.dataUsage.groupBy({
      by: ['dataType'],
      where: { userId },
      _sum: {
        sizeBytes: true
      }
    })

    const usageByTypeMap = {
      survey_data: 0,
      file_upload: 0,
      export_data: 0
    }

    usageByType.forEach(usage => {
      const dataType = usage.dataType as keyof typeof usageByTypeMap
      if (dataType in usageByTypeMap) {
        usageByTypeMap[dataType] = Math.round((usage._sum.sizeBytes || 0) / (1024 * 1024) * 100) / 100
      }
    })

    return NextResponse.json({
      totalMB: totalUsage.totalMB,
      usageByType: usageByTypeMap
    })

  } catch (error) {
    console.error('Error fetching data usage:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
