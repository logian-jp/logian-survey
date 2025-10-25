import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id
    const { type } = await request.json()

    // アンケートの所有者権限を確認
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        user: true
      }
    })

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    if (survey.userId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // エンタープライズプランの確認
    const userPlan = await prisma.userPlan.findFirst({
      where: { userId: session.user.id }
    })

    if (userPlan?.planType !== 'ENTERPRISE') {
      return NextResponse.json({ message: 'Enterprise plan required' }, { status: 403 })
    }

    // Base64データの場合はファイルシステムから削除する必要がない
    // データベースから直接削除するだけ

    // データベースを更新
    const updateData: any = {}
    if (type === 'header') {
      updateData.headerImageUrl = null
    } else if (type === 'og') {
      updateData.ogImageUrl = null
    }

    await prisma.survey.update({
      where: { id: surveyId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Image removed successfully'
    })

  } catch (error) {
    console.error('Image removal error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
