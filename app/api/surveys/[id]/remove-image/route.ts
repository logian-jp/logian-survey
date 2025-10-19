import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // ファイルパスを取得
    let imagePath: string | null = null
    if (type === 'header' && (survey as any).headerImageUrl) {
      imagePath = (survey as any).headerImageUrl.replace('/uploads/', '')
    } else if (type === 'og' && (survey as any).ogImageUrl) {
      imagePath = (survey as any).ogImageUrl.replace('/uploads/', '')
    }

    // ファイルを削除
    if (imagePath) {
      try {
        const fullPath = join(process.cwd(), 'public', imagePath)
        await unlink(fullPath)
      } catch (error) {
        console.error('File deletion error:', error)
        // ファイルが存在しない場合はエラーを無視
      }
    }

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
