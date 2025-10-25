import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { checkSurveyLimit } from '@/lib/plan-check'
import { recordDataUsage, getUserMaxDataSize, getUserDataRetentionDays } from '@/lib/plan-limits'
import { getTicketLimits } from '@/lib/ticket-check'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // Supabase SDKを使用してサーベイ情報を取得
    console.log('Fetching surveys for user:', session.user.id)
    
    // 1. ユーザーが所有するサーベイを取得
    const { data: ownSurveys, error: ownSurveysError } = await supabase
      .from('Survey')
      .select('*')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false })
    
    if (ownSurveysError) {
      console.error('Error fetching own surveys:', ownSurveysError)
      return NextResponse.json({ message: 'Failed to fetch surveys' }, { status: 500 })
    }
    
    // 2. ユーザーが共有されているサーベイを取得
    const { data: sharedSurveys, error: sharedSurveysError } = await supabase
      .from('SurveyUser')
      .select('surveyId, permission, Survey(*)')
      .eq('userId', session.user.id)
    
    if (sharedSurveysError) {
      console.error('Error fetching shared surveys:', sharedSurveysError)
      return NextResponse.json({ message: 'Failed to fetch shared surveys' }, { status: 500 })
    }
    
    // 3. 全てのサーベイをまとめる（重複排除）
    const allSurveyIds = new Set()
    const surveys = []
    
    // 自分のサーベイを追加
    if (ownSurveys) {
      for (const survey of ownSurveys) {
        allSurveyIds.add(survey.id)
        surveys.push({
          ...survey,
          isOwner: true,
          permission: 'ADMIN'
        })
      }
    }
    
    // 共有されたサーベイを追加（重複を除外）
    if (sharedSurveys) {
      for (const surveyUser of sharedSurveys) {
        if (!allSurveyIds.has(surveyUser.surveyId) && surveyUser.Survey) {
          allSurveyIds.add(surveyUser.surveyId)
          surveys.push({
            ...surveyUser.Survey,
            isOwner: false,
            permission: surveyUser.permission
          })
        }
      }
    }
    
    console.log('Found surveys:', surveys.length)

    // 4. 各サーベイのレスポンス件数を取得
    const surveysWithCounts = []
    for (const survey of surveys) {
      const { count: responseCount, error: countError } = await supabase
        .from('Response')
        .select('*', { count: 'exact', head: true })
        .eq('surveyId', survey.id)
      
      if (countError) {
        console.error('Error counting responses for survey:', survey.id, countError)
      }
      
      surveysWithCounts.push({
        ...survey,
        _count: {
          responses: responseCount || 0
        }
      })
    }
    
    // 5. ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', session.user.id)
      .single()
    
    if (userError) {
      console.error('Error fetching user data:', userError)
    }
    
    // 6. ユーザーのチケット情報を取得（プラン情報の代わり）
    const { data: userTickets, error: ticketError } = await supabase
      .from('UserTicket')
      .select('*')
      .eq('userId', session.user.id)
      .order('ticketType', { ascending: true })
    
    if (ticketError) {
      console.error('Error fetching user tickets:', ticketError)
    }
    
    // 最も高いチケットタイプを取得（FREE以外）  
    const highestTicket = userTickets && userTickets.length > 0 
      ? userTickets
          .filter(t => t.ticketType !== 'FREE' && t.remainingTickets > 0)
          .sort((a, b) => {
            const order = ['FREE', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE']
            return order.indexOf(a.ticketType) - order.indexOf(b.ticketType)
          })[0]
      : null
    
    const planType = highestTicket?.ticketType || 'FREE'

    // ユーザーの最大データサイズと保存期間を取得
    const maxDataSizeMB = await getUserMaxDataSize(session.user.id, planType)
    const dataRetentionDays = await getUserDataRetentionDays(session.user.id, planType)

    // 簡略化されたレスポンスを返す（データ使用量計算はSupabase SDKで後で実装）
    const responseData = {
      surveys: surveysWithCounts.map(survey => ({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        shareUrl: survey.shareUrl,
        createdAt: survey.createdAt,
        updatedAt: survey.updatedAt,
        responseCount: survey._count.responses,
        maxResponses: survey.maxResponses,
        endDate: survey.endDate,
        targetResponses: survey.targetResponses,
        headerImageUrl: survey.headerImageUrl,
        ogImageUrl: survey.ogImageUrl,
        useCustomLogo: survey.useCustomLogo,
        customDomain: survey.customDomain,
        dataRetentionDays: survey.dataRetentionDays,
        user: userData,
        permission: survey.permission || 'ADMIN',
        isOwner: survey.isOwner || false
      })),
      planType,
      userPlan: {
        type: planType,
        maxSurveys: planType === 'FREE' ? 1 : planType === 'STANDARD' ? 5 : planType === 'PROFESSIONAL' ? 20 : 100,
        maxResponses: planType === 'FREE' ? 100 : planType === 'STANDARD' ? 1000 : planType === 'PROFESSIONAL' ? 5000 : 50000,
        canCreateSurvey: true,
        canViewResponses: true,
        canExportData: planType !== 'FREE',
        canCustomizeLogo: planType === 'ENTERPRISE'
      },
      tickets: userTickets || [],
      meta: {
        totalSurveys: surveysWithCounts.length,
        maxDataSizeMB: planType === 'FREE' ? 10 : planType === 'STANDARD' ? 100 : planType === 'PROFESSIONAL' ? 500 : 2000,
        dataRetentionDays: planType === 'FREE' ? 30 : planType === 'STANDARD' ? 90 : planType === 'PROFESSIONAL' ? 365 : 1095
      }
    }
    
    console.log('Returning survey data for user:', session.user.id, 'surveys:', responseData.surveys.length)
    return NextResponse.json(responseData)
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

    // メールアドレスでユーザーを検索 (Supabase SDK使用)
    const { data: existingUser, error: findUserError } = await supabase
      .from('User')
      .select('*')
      .eq('email', session.user.email!)
      .single()

    let user
    if (findUserError || !existingUser) {
      console.log('User not found, creating new user...')
      // ユーザーが存在しない場合は作成
      const { data: newUser, error: createUserError } = await supabase
        .from('User')
        .insert({
          name: session.user.name,
          email: session.user.email,
          role: 'USER'
        })
        .select()
        .single()
      
      if (createUserError) {
        console.error('Failed to create user:', createUserError)
        return NextResponse.json({ message: 'Failed to create user' }, { status: 500 })
      }
      
      user = newUser
      console.log('User created:', user)
    } else {
      user = existingUser
      console.log('User found:', user)
    }

    const { title, description, maxResponses, endDate, targetResponses, ticketType } = await request.json()

    console.log('Survey creation request data:', {
      title,
      description,
      maxResponses,
      endDate,
      targetResponses,
      ticketType
    })

    // チケットタイプの検証とデフォルト値
    const validTicketType = ticketType || 'FREE'
    
    console.log('Valid ticket type:', validTicketType)

    // 無料チケットでのアンケート作成数制限チェック（FREEの場合のみ）
    if (validTicketType === 'FREE') {
      const { count: freeSurveyCount, error: countError } = await supabase
        .from('Survey')
        .select('*', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('ticketType', 'FREE')

      if (countError) {
        console.error('Failed to count surveys:', countError)
        return NextResponse.json({ message: 'Failed to check survey limit' }, { status: 500 })
      }

      if ((freeSurveyCount || 0) >= 3) {
        return NextResponse.json(
          { message: '無料チケットでは3個までアンケートを作成できます。チケットを購入してアンケートを作成してください。' },
          { status: 403 }
        )
      }
    }

    if (!title) {
      return NextResponse.json(
        { message: 'Title is required' },
        { status: 400 }
      )
    }

    const limits = getTicketLimits(validTicketType)

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

    // アンケート作成と作成者の管理者権限付与 (Supabase SDK使用)
    let usedTicketId = null
    let paymentId = null

    // 非FREEチケットは消費
    if (validTicketType !== 'FREE') {
      // チケットを検索
      const { data: tickets, error: ticketError } = await supabase
        .from('UserTicket')
        .select('*')
        .eq('userId', user.id)
        .eq('ticketType', validTicketType)
        .gt('remainingTickets', 0)
        .order('createdAt', { ascending: true })
        .limit(1)

      if (ticketError || !tickets || tickets.length === 0) {
        return NextResponse.json(
          { message: 'チケット残数が不足しています' },
          { status: 403 }
        )
      }

      const ticket = tickets[0]
      usedTicketId = ticket.id

      // 決済IDを取得（チケットに関連する決済情報から）
      const { data: purchases, error: purchaseError } = await supabase
        .from('TicketPurchase')
        .select('*')
        .eq('userId', user.id)
        .eq('ticketType', validTicketType)
        .order('createdAt', { ascending: false })
        .limit(1)

      if (!purchaseError && purchases && purchases.length > 0) {
        paymentId = purchases[0].paymentIntentId
      }

      // チケット数を更新
      const { error: updateTicketError } = await supabase
        .from('UserTicket')
        .update({
          remainingTickets: ticket.remainingTickets - 1,
          usedTickets: ticket.usedTickets + 1
        })
        .eq('id', ticket.id)

      if (updateTicketError) {
        console.error('Failed to update ticket:', updateTicketError)
        return NextResponse.json({ message: 'Failed to consume ticket' }, { status: 500 })
      }
    }

    // アンケートを作成
    const surveyId = crypto.randomUUID()
    const { data: survey, error: createSurveyError } = await supabase
      .from('Survey')
      .insert({
        id: surveyId,
        title,
        description: description || null,
        maxResponses: clampedMaxResponses,
        endDate: clampedEndDate,
        targetResponses: targetResponses || null,
        userId: user.id,
        ticketType: validTicketType,
        ticketId: usedTicketId,
        paymentId: paymentId,
      })
      .select()
      .single()

    if (createSurveyError) {
      console.error('Failed to create survey:', createSurveyError)
      return NextResponse.json({ message: 'Failed to create survey' }, { status: 500 })
    }

    // 作成者を管理者権限でSurveyUserテーブルに追加
    const { error: createSurveyUserError } = await supabase
      .from('SurveyUser')
      .insert({
        userId: user.id,
        surveyId: survey.id,
        permission: 'ADMIN',
        invitedBy: user.id, // 自分自身を招待者として設定
        acceptedAt: new Date().toISOString(), // 即座に承認済みとして設定
      })

    if (createSurveyUserError) {
      console.error('Failed to create survey user relationship:', createSurveyUserError)
      // アンケート作成は成功しているので、ログだけ出して続行
    }

    const result = survey

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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
