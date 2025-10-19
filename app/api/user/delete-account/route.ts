import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーに関連するすべてのデータを削除
    await prisma.$transaction(async (tx) => {
      const userId = session.user.id

      // 1. アンケートの回答を削除
      await tx.response.deleteMany({
        where: {
          survey: {
            userId: userId
          }
        }
      })

      // 2. アンケートの質問を削除
      await tx.question.deleteMany({
        where: {
          survey: {
            userId: userId
          }
        }
      })

      // 3. 協力者関係を削除
      await tx.surveyUser.deleteMany({
        where: {
          OR: [
            { userId: userId },
            { invitedBy: userId }
          ]
        }
      })

      // 4. アンケートを削除
      await tx.survey.deleteMany({
        where: { userId: userId }
      })

      // 5. 質問テンプレートを削除
      await tx.questionTemplate.deleteMany({
        where: { userId: userId }
      })

      // 6. ディスカウントリンクを削除
      await tx.discountLink.deleteMany({
        where: {
          createdBy: userId
        }
      })

      // 7. お知らせ配信履歴を削除
      await tx.announcementDelivery.deleteMany({
        where: { userId: userId }
      })

      // 8. ユーザープランを削除
      await tx.userPlan.deleteMany({
        where: { userId: userId }
      })

      // 9. セッションを削除
      await tx.session.deleteMany({
        where: { userId: userId }
      })

      // 10. アカウント情報を削除
      await tx.account.deleteMany({
        where: { userId: userId }
      })

      // 11. 最後にユーザーを削除
      await tx.user.delete({
        where: { id: userId }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
