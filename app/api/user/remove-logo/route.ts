import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { getUserPlan } from '@/lib/plan-limits'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // プランチェック
    const userPlan = await getUserPlan(session.user.id)
    if (userPlan?.planType !== 'ENTERPRISE') {
      return NextResponse.json({ message: 'Enterprise plan required' }, { status: 403 })
    }

    // ユーザーのカスタムロゴURLを取得
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { customLogoUrl: true }
    })

    // ファイルを削除
    if (user?.customLogoUrl) {
      try {
        const imagePath = user.customLogoUrl.replace('/uploads/', '')
        const fullPath = join(process.cwd(), 'public', imagePath)
        await unlink(fullPath)
      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          console.warn(`File not found, but proceeding with DB update: ${user.customLogoUrl}`)
        } else {
          console.error('Failed to delete file from filesystem:', fileError)
          return NextResponse.json(
            { message: 'Failed to delete logo file' },
            { status: 500 }
          )
        }
      }
    }

    // データベースを更新
    await prisma.user.update({
      where: { id: session.user.id },
      data: { customLogoUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logo removal error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
