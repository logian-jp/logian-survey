import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーに関連するすべてのデータを削除 (Supabase SDK使用)
    // NOTE: Supabaseではトランザクションの代わりに順次削除を実行
    const userId = session.user.id

    try {
      // 1. ユーザーのアンケートIDを取得
      console.log('Getting user surveys...')
      const { data: userSurveys } = await supabase
        .from('Survey')
        .select('id')
        .eq('userId', userId)
      
      const surveyIds = userSurveys?.map(s => s.id) || []

      // 2. アンケートの回答を削除
      if (surveyIds.length > 0) {
        console.log('Deleting responses...')
        await supabase
          .from('Response')
          .delete()
          .in('surveyId', surveyIds)
      }

      // 3. アンケートの質問を削除
      if (surveyIds.length > 0) {
        console.log('Deleting questions...')
        await supabase
          .from('Question')
          .delete()
          .in('surveyId', surveyIds)
      }

      // 4. 協力者関係を削除
      console.log('Deleting survey collaborations...')
      await supabase
        .from('SurveyUser')
        .delete()
        .or(`userId.eq.${userId},invitedBy.eq.${userId}`)

      // 5. アンケートを削除
      console.log('Deleting surveys...')
      await supabase
        .from('Survey')
        .delete()
        .eq('userId', userId)

      // 6. 質問テンプレートを削除
      console.log('Deleting question templates...')
      await supabase
        .from('QuestionTemplate')
        .delete()
        .eq('userId', userId)

      // 7. ディスカウントリンクを削除
      console.log('Deleting discount links...')
      await supabase
        .from('DiscountLink')
        .delete()
        .eq('createdBy', userId)

      // 8. お知らせ配信履歴を削除
      console.log('Deleting announcement deliveries...')
      await supabase
        .from('AnnouncementDelivery')
        .delete()
        .eq('userId', userId)

      // 9. セッションを削除 (NextAuth関連)
      console.log('Deleting sessions...')
      await supabase
        .from('Session')
        .delete()
        .eq('userId', userId)

      // 10. アカウント情報を削除 (NextAuth関連)
      console.log('Deleting accounts...')
      await supabase
        .from('Account')
        .delete()
        .eq('userId', userId)

      // 11. 最後にユーザーを削除
      console.log('Deleting user...')
      const { error: userDeleteError } = await supabase
        .from('User')
        .delete()
        .eq('id', userId)

      if (userDeleteError) {
        throw userDeleteError
      }

      console.log('Account deletion completed successfully')
    } catch (error) {
      console.error('Error during account deletion:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
