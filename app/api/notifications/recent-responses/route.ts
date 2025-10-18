import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Notification API called for user:', session.user.id)

    // ユーザーがアクセス可能なアンケートのIDを取得
    const userSurveys = await prisma.surveyUser.findMany({
      where: {
        userId: session.user.id,
        permission: {
          in: ['ADMIN', 'EDIT', 'VIEW']
        }
      },
      select: {
        surveyId: true
      }
    })

    // ユーザーが所有者のアンケートも取得
    const ownedSurveys = await prisma.survey.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true
      }
    })

    const ownedSurveyIds = ownedSurveys.map(s => s.id)
    const userSurveyIds = userSurveys.map(su => su.surveyId)
    const allSurveyIds = Array.from(new Set([...userSurveyIds, ...ownedSurveyIds]))

    console.log('User surveys:', userSurveyIds.length)
    console.log('Owned surveys:', ownedSurveyIds.length)
    console.log('All survey IDs:', allSurveyIds)

    if (allSurveyIds.length === 0) {
      console.log('No surveys found for user')
      return NextResponse.json([])
    }

    // 最新10件の回答を取得
    const recentResponses = await prisma.response.findMany({
      where: {
        surveyId: {
          in: allSurveyIds
        }
      },
      include: {
        survey: {
          select: {
            id: true,
            title: true
          }
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                title: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    console.log('Found responses:', recentResponses.length)

    // 通知用のデータを整形
    const notifications = recentResponses.map(response => {
      console.log('Processing response:', response.id, 'with', response.answers.length, 'answers')
      
      // 名前やIDの情報を取得（NAMEタイプの質問から）
      const nameAnswer = response.answers.find(answer => 
        answer.question.type === 'NAME'
      )
      
      // メールアドレスの情報を取得（EMAILタイプの質問から）
      const emailAnswer = response.answers.find(answer => 
        answer.question.type === 'EMAIL'
      )

      // テキスト入力の回答からもIDを取得（最初のテキスト回答）
      const textAnswer = response.answers.find(answer => 
        answer.question.type === 'TEXT' && answer.value
      )

      const respondentId = nameAnswer?.value || 
                          emailAnswer?.value || 
                          textAnswer?.value || 
                          `回答者${response.id.slice(-6)}`

      console.log('Respondent ID:', respondentId)

      return {
        id: response.id,
        surveyId: response.survey.id,
        surveyTitle: response.survey.title,
        respondentId: respondentId,
        createdAt: response.createdAt,
        answerCount: response.answers.length
      }
    })

    console.log('Returning notifications:', notifications.length)
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Failed to fetch recent responses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
