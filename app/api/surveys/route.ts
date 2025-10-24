import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkSurveyLimit } from '@/lib/plan-check'
import { recordDataUsage, getUserMaxDataSize, getUserDataRetentionDays, getPlanLimits } from '@/lib/plan-limits'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    console.log('Surveys API - Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    })

    if (!session?.user?.id) {
      console.log('No session or user ID found')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveys = await prisma.survey.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          {
            surveyUsers: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      include: {
        _count: {
          select: {
            responses: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        surveyUsers: {
          where: {
            userId: session.user.id
          },
          select: {
            permission: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // ユーザーのチケット情報を取得（プラン情報の代わり）
    const userTickets = await prisma.userTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { ticketType: 'asc' }
    })
    
    // 最も高いチケットタイプを取得（FREE以外）
    const highestTicket = userTickets
      .filter(t => t.ticketType !== 'FREE' && t.remainingTickets > 0)
      .sort((a, b) => {
        const order = ['FREE', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE']
        return order.indexOf(a.ticketType) - order.indexOf(b.ticketType)
      })[0]
    
    const planType = highestTicket?.ticketType || 'FREE'

    // ユーザーの最大データサイズと保存期間を取得
    const maxDataSizeMB = await getUserMaxDataSize(session.user.id, planType)
    const dataRetentionDays = await getUserDataRetentionDays(session.user.id, planType)

    // 各アンケートのデータ使用量を計算
    const surveysWithDataUsage = await Promise.all(surveys.map(async (survey) => {
      // アンケートのデータ使用量を取得
      const surveyDataUsage = await prisma.dataUsage.findFirst({
        where: {
          userId: session.user.id,
          surveyId: survey.id,
          dataType: 'survey_data'
        }
      })

          // アンケート固有のアドオン情報を取得
          const surveyAddons = await prisma.userDataAddon.findMany({
            where: {
              userId: session.user.id,
              status: 'ACTIVE',
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            },
            include: {
              addon: true
            }
          })

      const isOwner = survey.userId === session.user.id
      const userPermission = survey.surveyUsers[0]?.permission

      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        shareUrl: survey.shareUrl,
        createdAt: survey.createdAt,
        responseCount: survey._count.responses,
        maxResponses: survey.maxResponses,
        endDate: survey.endDate,
        targetResponses: survey.targetResponses,
        owner: survey.user,
        userPermission: isOwner ? 'OWNER' : userPermission || 'VIEW',
        // データ使用量情報
        dataUsageMB: surveyDataUsage ? Math.round(surveyDataUsage.sizeBytes / 1024 / 1024 * 100) / 100 : 0,
        maxDataSizeMB,
        dataRetentionDays,
        // アドオン情報
        hasAddons: surveyAddons.length > 0,
        addons: surveyAddons.map((addon: any) => ({
          id: addon.addon.id,
          name: addon.addon.name,
          type: addon.addon.type,
          amount: addon.addon.amount,
          isMonthly: addon.addon.isMonthly,
          expiresAt: addon.expiresAt
        }))
      }
    }))

    return NextResponse.json(surveysWithDataUsage)
  } catch (error) {
    console.error('Failed to fetch surveys:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    console.log('Creating survey for user:', session.user.id)
    console.log('Session user:', session.user)

    // メールアドレスでユーザーを検索
    let user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      console.log('User not found, creating new user...')
      // ユーザーが存在しない場合は作成
      user = await prisma.user.create({
        data: {
          name: session.user.name,
          email: session.user.email,
          role: 'USER'
        }
      })
      console.log('User created:', user)
    } else {
      console.log('User found:', user)
    }

    // 無料チケットでのアンケート作成数制限チェック
    const freeSurveyCount = await prisma.survey.count({
      where: {
        userId: user.id,
        ticketType: 'FREE'
      }
    })

    if (freeSurveyCount >= 3) {
      return NextResponse.json(
        { message: '無料チケットでは3個までアンケートを作成できます。チケットを購入してアンケートを作成してください。' },
        { status: 403 }
      )
    }

    const { title, description, maxResponses, endDate, targetResponses, ticketType } = await request.json()

    if (!title) {
      return NextResponse.json(
        { message: 'Title is required' },
        { status: 400 }
      )
    }

    // チケットタイプの検証とデフォルト値
    const validTicketType = ticketType || 'FREE'
    const limits = getPlanLimits(validTicketType)

    // 回答上限の丸め（プラン上限を超えない）
    const clampedMaxResponses = (() => {
      if (limits.maxResponsesPerSurvey === -1) return maxResponses || null
      if (typeof maxResponses === 'number') {
        return Math.min(maxResponses, limits.maxResponsesPerSurvey)
      }
      return limits.maxResponsesPerSurvey
    })()

    // 募集期間の丸め（現在時刻からプラン上限日数まで）
    const now = new Date()
    const maxEndDateByPlan = limits.surveyDurationDays
      ? new Date(now.getTime() + limits.surveyDurationDays * 24 * 60 * 60 * 1000)
      : null
    const clampedEndDate = (() => {
      if (!maxEndDateByPlan) return endDate || null
      const requested = endDate ? new Date(endDate) : null
      if (!requested) return maxEndDateByPlan
      return requested < maxEndDateByPlan ? requested : maxEndDateByPlan
    })()

    // アンケート作成と作成者の管理者権限付与をトランザクションで実行（非FREEはチケット消費）
    const result = await prisma.$transaction(async (tx) => {
      // 非FREEチケットは消費
      if (validTicketType !== 'FREE') {
        const ticket = await tx.userTicket.findFirst({
          where: { userId: user.id, ticketType: validTicketType, remainingTickets: { gt: 0 } },
          orderBy: { createdAt: 'asc' }
        })
        if (!ticket) {
          throw new Error('チケット残数が不足しています')
        }
        await tx.userTicket.update({
          where: { id: ticket.id },
          data: { remainingTickets: ticket.remainingTickets - 1, usedTickets: ticket.usedTickets + 1 }
        })
      }

      // アンケートを作成
      const survey = await tx.survey.create({
        data: {
          title,
          description: description || null,
          maxResponses: clampedMaxResponses,
          endDate: clampedEndDate,
          targetResponses: targetResponses || null,
          userId: user.id,
          ticketType: validTicketType,
        },
      })

      // 作成者を管理者権限でSurveyUserテーブルに追加
      await tx.surveyUser.create({
        data: {
          userId: user.id,
          surveyId: survey.id,
          permission: 'ADMIN',
          invitedBy: user.id, // 自分自身を招待者として設定
          acceptedAt: new Date(), // 即座に承認済みとして設定
        },
      })

      return survey
    })

    // データ使用量を記録（アンケート作成時）
    const surveyDataSize = JSON.stringify({
      title,
      description,
      maxResponses,
      endDate,
      targetResponses
    }).length

    await recordDataUsage(user.id, result.id, 'survey_data', surveyDataSize, `アンケート「${title}」の作成`)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to create survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
