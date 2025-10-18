import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // 一般ユーザーがアクセス可能なプラン設定を取得
    const planConfigs = await prisma.planConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(planConfigs)
  } catch (error) {
    console.error('Failed to fetch plan configs:', error)
    return NextResponse.json(
      { message: 'Failed to fetch plan configurations' },
      { status: 500 }
    )
  }
}