import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { hash } from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { code, name, email, password } = await request.json()

    if (!code || !name || !email || !password) {
      return NextResponse.json(
        { message: 'すべてのフィールドが必要です' },
        { status: 400 }
      )
    }

    // 招待コードを検証 (Supabase SDK使用)
    const { data: invitation, error: invitationError } = await supabase
      .from('Invitation')
      .select(`
        *,
        inviter:User!inviterId(id, name, email)
      `)
      .eq('code', code)
      .single()

    if (invitationError) {
      console.error('Error fetching invitation:', invitationError)
    }

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

    // メールアドレスの重複チェック (Supabase SDK使用)
    const { data: existingUser, error: userCheckError } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single()

    if (existingUser && !userCheckError) {
      return NextResponse.json(
        { message: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await hash(password, 12)

    // ユーザー作成と招待使用を順次処理 (Supabase SDK使用)
    // 1. 新しいユーザーを作成
    const { data: newUser, error: createUserError } = await supabase
      .from('User')
      .insert({
        name,
        email,
        password: hashedPassword,
        invitedBy: invitation.inviterId,
        invitationCode: code,
        maxInvitations: 3, // 新規ユーザーは3人まで招待可能
        usedInvitations: 0
      })
      .select()
      .single()

    if (createUserError) {
      console.error('Failed to create user:', createUserError)
      return NextResponse.json({ message: 'ユーザー作成に失敗しました' }, { status: 500 })
    }

    // 2. 招待を使用済みにマーク
    const { error: updateInvitationError } = await supabase
      .from('Invitation')
      .update({
        isUsed: true,
        usedAt: new Date().toISOString(),
        usedByUserId: newUser.id
      })
      .eq('id', invitation.id)

    if (updateInvitationError) {
      console.error('Failed to update invitation:', updateInvitationError)
      // ユーザー作成をロールバック
      await supabase.from('User').delete().eq('id', newUser.id)
      return NextResponse.json({ message: '招待の更新に失敗しました' }, { status: 500 })
    }

    // 3. 招待者にスタンダードチケットを1枚付与
    const { data: existingTicket, error: ticketCheckError } = await supabase
      .from('UserTicket')
      .select('*')
      .eq('userId', invitation.inviterId)
      .eq('ticketType', 'STANDARD')
      .single()

    if (existingTicket && !ticketCheckError) {
      // 既存のスタンダードチケットがある場合は追加
      const { error: updateTicketError } = await supabase
        .from('UserTicket')
        .update({
          totalTickets: existingTicket.totalTickets + 1,
          remainingTickets: existingTicket.remainingTickets + 1
        })
        .eq('id', existingTicket.id)

      if (updateTicketError) {
        console.error('Failed to update ticket:', updateTicketError)
      }
    } else {
      // 新しいスタンダードチケットを作成
      const { error: createTicketError } = await supabase
        .from('UserTicket')
        .insert({
          userId: invitation.inviterId,
          ticketType: 'STANDARD',
          totalTickets: 1,
          usedTickets: 0,
          remainingTickets: 1
        })

      if (createTicketError) {
        console.error('Failed to create ticket:', createTicketError)
      }
    }

    // 4. 招待リワードの購入履歴を記録
    const { error: purchaseError } = await supabase
      .from('TicketPurchase')
      .insert({
        userId: invitation.inviterId,
        ticketType: 'STANDARD',
        amount: 0,
        currency: 'JPY',
        checkoutSessionId: `invitation_reward_${invitation.id}_${Date.now()}`,
        metadata: JSON.stringify({
          type: 'invitation_reward',
          invitationId: invitation.id,
          invitedUserEmail: email,
          invitedUserName: name
        })
      })

    if (purchaseError) {
      console.error('Failed to create purchase record:', purchaseError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      },
      message: 'アカウントが作成されました。招待者にスタンダードチケットが1枚付与されました。'
    })
  } catch (error) {
    console.error('Failed to use invitation:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
