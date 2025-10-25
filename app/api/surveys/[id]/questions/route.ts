import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id

    // アンケートの存在確認と権限チェック
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

    // アンケートに関連するすべての質問を削除
    await prisma.question.deleteMany({
      where: {
        surveyId: surveyId,
      },
    })

    return NextResponse.json({ message: 'Questions deleted successfully' })
  } catch (error) {
    console.error('Failed to delete questions:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
