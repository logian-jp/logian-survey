import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { canAdminSurvey } from '@/lib/survey-permissions'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// アンケートの協力者一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id

    // アンケートの管理者権限があるかチェック
    const hasAdminPermission = await canAdminSurvey(session.user.id, surveyId)
    if (!hasAdminPermission) {
      return NextResponse.json({ message: 'このアンケートの管理者権限がありません' }, { status: 403 })
    }

    // アンケート情報を取得
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select(`
        *,
        user:User!userId(id, name, email),
        surveyUsers:SurveyUser(
          id, permission, invitedAt, acceptedAt, invitedBy,
          user:User!userId(id, name, email)
        )
      `)
      .eq('id', surveyId)
      .single()

    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        owner: survey.user,
        collaborators: survey.surveyUsers.map(su => ({
          id: su.id,
          user: su.user,
          permission: su.permission,
          invitedAt: su.invitedAt,
          acceptedAt: su.acceptedAt,
          invitedBy: su.invitedBy
        }))
      }
    })
  } catch (error) {
    console.error('Failed to fetch collaborators:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 新しい協力者を招待
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id
    const { email, permission } = await request.json()

    if (!email || !permission) {
      return NextResponse.json(
        { message: 'Email and permission are required' },
        { status: 400 }
      )
    }

    // アンケートの管理者権限があるかチェック
    const hasAdminPermission = await canAdminSurvey(session.user.id, surveyId)
    if (!hasAdminPermission) {
      return NextResponse.json({ message: 'このアンケートの管理者権限がありません' }, { status: 403 })
    }

    // アンケートの存在確認
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select('*')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      return NextResponse.json({ message: 'アンケートが見つかりません' }, { status: 404 })
    }

    // 招待するユーザーを検索
    const { data: invitedUser, error: userError } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('email', email)
      .single()

    if (userError || !invitedUser) {
      return NextResponse.json({ message: 'このメールアドレスで登録されているユーザーが見つかりません。まずユーザーにアカウント登録をしてもらってください。' }, { status: 404 })
    }

    // 自分自身を招待しようとしているかチェック
    if (invitedUser.id === session.user.id) {
      return NextResponse.json({ message: '自分自身を招待することはできません' }, { status: 400 })
    }

    // 既に招待されているかチェック
    const { data: existingInvitation, error: invitationError } = await supabase
      .from('SurveyUser')
      .select('*')
      .eq('userId', invitedUser.id)
      .eq('surveyId', surveyId)
      .single()

    if (!invitationError && existingInvitation) {
      return NextResponse.json({ message: 'このユーザーは既に招待されています' }, { status: 400 })
    }

    // 招待を作成
    const { data: invitation, error: createError } = await supabase
      .from('SurveyUser')
      .insert({
        userId: invitedUser.id,
        surveyId: surveyId,
        permission: permission as 'EDIT' | 'VIEW' | 'ADMIN',
        invitedBy: session.user.id
      })
      .select(`
        *,
        user:User!userId(id, name, email)
      `)
      .single()

    if (createError) {
      console.error('Error creating invitation:', createError)
      return NextResponse.json({ message: 'Failed to create invitation' }, { status: 500 })
    }

    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    console.error('Failed to invite collaborator:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
