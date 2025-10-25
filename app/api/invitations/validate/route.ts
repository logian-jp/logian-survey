import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json(
        { message: '招待コードが必要です' },
        { status: 400 }
      )
    }

    // 招待コードを検証 (Supabase SDK使用)
    const { data: invitations, error: invitationError } = await supabase
      .from('Invitation')
      .select(`
        *,
        inviter:User!inviterId(id, name, email)
      `)
      .eq('code', code)
      .single()

    if (invitationError) {
      console.error('Error fetching invitation:', invitationError)
      return NextResponse.json(
        { message: '招待コードの確認中にエラーが発生しました' },
        { status: 500 }
      )
    }

    const invitation = invitations

    if (!invitation) {
      return NextResponse.json(
        { message: '無効な招待コードです' },
        { status: 404 }
      )
    }

    if (invitation.isUsed) {
      return NextResponse.json(
        { message: 'この招待コードは既に使用されています' },
        { status: 400 }
      )
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { message: 'この招待コードは期限切れです' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        inviterName: invitation.inviterName || invitation.inviter.name,
        inviterEmail: invitation.inviterEmail,
        message: invitation.message,
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName
      }
    })
  } catch (error) {
    console.error('Failed to validate invitation:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
