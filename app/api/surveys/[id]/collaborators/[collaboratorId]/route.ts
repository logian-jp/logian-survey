import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { canAdminSurvey } from '@/lib/survey-permissions'

// 協力者の権限を更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id
    const collaboratorId = (await params).collaboratorId
    const { permission } = await request.json()

    if (!permission) {
      return NextResponse.json(
        { message: 'Permission is required' },
        { status: 400 }
      )
    }

    // アンケートの管理者権限があるかチェック
    const hasAdminPermission = await canAdminSurvey(session.user.id, surveyId)
    if (!hasAdminPermission) {
      return NextResponse.json({ message: 'このアンケートの管理者権限がありません' }, { status: 403 })
    }

    // 更新対象の協力者情報を取得
    const { data: collaboratorToUpdate, error: collaboratorError } = await supabase
      .from('SurveyUser')
      .select(`
        *,
        survey:Survey!surveyId(userId)
      `)
      .eq('id', collaboratorId)
      .eq('surveyId', surveyId)
      .single()

    if (collaboratorError || !collaboratorToUpdate) {
      return NextResponse.json({ message: '協力者が見つかりません' }, { status: 404 })
    }

    // 所有者の権限を変更しようとしている場合は拒否
    if (collaboratorToUpdate.userId === collaboratorToUpdate.survey.userId) {
      return NextResponse.json({ message: 'アンケートの所有者の権限は変更できません' }, { status: 403 })
    }

    // 協力者を更新
    const { data: updatedCollaborator, error: updateError } = await supabase
      .from('SurveyUser')
      .update({
        permission: permission as 'EDIT' | 'VIEW' | 'ADMIN'
      })
      .eq('id', collaboratorId)
      .eq('surveyId', surveyId)
      .select(`
        *,
        user:User!userId(id, name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating collaborator:', updateError)
      return NextResponse.json({ message: 'Failed to update collaborator' }, { status: 500 })
    }

    return NextResponse.json(updatedCollaborator)
  } catch (error) {
    console.error('Failed to update collaborator:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 協力者を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = (await params).id
    const collaboratorId = (await params).collaboratorId

    // アンケートの管理者権限があるかチェック
    const hasAdminPermission = await canAdminSurvey(session.user.id, surveyId)
    if (!hasAdminPermission) {
      return NextResponse.json({ message: 'このアンケートの管理者権限がありません' }, { status: 403 })
    }

    // 削除対象の協力者情報を取得
    const { data: collaboratorToDelete, error: deleteCollaboratorError } = await supabase
      .from('SurveyUser')
      .select(`
        *,
        survey:Survey!surveyId(userId)
      `)
      .eq('id', collaboratorId)
      .eq('surveyId', surveyId)
      .single()

    if (deleteCollaboratorError || !collaboratorToDelete) {
      return NextResponse.json({ message: '協力者が見つかりません' }, { status: 404 })
    }

    // 所有者を削除しようとしている場合は拒否
    if (collaboratorToDelete.userId === collaboratorToDelete.survey.userId) {
      return NextResponse.json({ message: 'アンケートの所有者は削除できません' }, { status: 403 })
    }

    // 協力者を削除
    const { error: deleteError } = await supabase
      .from('SurveyUser')
      .delete()
      .eq('id', collaboratorId)
      .eq('surveyId', surveyId)

    if (deleteError) {
      console.error('Error deleting collaborator:', deleteError)
      return NextResponse.json({ message: 'Failed to delete collaborator' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Collaborator removed successfully' })
  } catch (error) {
    console.error('Failed to remove collaborator:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
