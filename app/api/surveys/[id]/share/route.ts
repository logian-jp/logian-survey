import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

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

    // アンケートの所有者を確認
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        userId: session.user.id,
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // 共有URLを生成（ランダムな文字列）
    const shareUrl = randomBytes(16).toString('hex')

    // アンケートを公開状態にして共有URLを設定
    const updatedSurvey = await prisma.survey.update({
      where: { id: surveyId },
      data: {
        status: 'ACTIVE',
        shareUrl: shareUrl,
      },
    })

    return NextResponse.json({
      shareUrl: shareUrl,
      publicUrl: `${process.env.NEXTAUTH_URL}/survey/${shareUrl}`,
    })
  } catch (error) {
    console.error('Failed to share survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id

    // アンケートの所有者を確認
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        userId: session.user.id,
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // アンケートを下書き状態にして共有URLを削除
    const updatedSurvey = await prisma.survey.update({
      where: { id: surveyId },
      data: {
        status: 'DRAFT',
        shareUrl: null,
      },
    })

    return NextResponse.json({ message: 'Survey unshared successfully' })
  } catch (error) {
    console.error('Failed to unshare survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
