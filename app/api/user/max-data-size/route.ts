import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserMaxDataSize } from '@/lib/plan-limits'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id
    const planType = searchParams.get('planType') || 'FREE'

    // ユーザーの最大データサイズを取得（アドオンを含む）
    const maxDataSizeMB = await getUserMaxDataSize(userId, planType)

    return NextResponse.json({
      maxDataSizeMB
    })
  } catch (error) {
    console.error('Error fetching max data size:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
