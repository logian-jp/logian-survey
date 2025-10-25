import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { invitedEmail, invitedName, message } = await request.json()

    // ユーザーの招待可能数をチェック (Supabase SDK使用)
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('maxInvitations, usedInvitations')
      .eq('id', session.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ message: 'Failed to fetch user data' }, { status: 500 })
    }

    const user = users

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.usedInvitations >= user.maxInvitations) {
      return NextResponse.json(
        { message: '招待可能な人数に達しています' },
        { status: 400 }
      )
    }

    // 招待コードを生成
    const invitationCode = randomBytes(16).toString('hex')

    // 招待レコードを作成 (Supabase SDK使用)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後

    const { data: invitation, error: invitationCreateError } = await supabase
      .from('Invitation')
      .insert({
        code: invitationCode,
        inviterId: session.user.id,
        inviterEmail: session.user.email || '',
        inviterName: session.user.name || null,
        invitedEmail: invitedEmail || null,
        invitedName: invitedName || null,
        message: message || null,
        expiresAt: expiresAt.toISOString()
      })
      .select()
      .single()

    if (invitationCreateError) {
      console.error('Error creating invitation:', invitationCreateError)
      return NextResponse.json({ message: 'Failed to create invitation' }, { status: 500 })
    }

    // ユーザーの使用済み招待数をインクリメント
    const { error: updateError } = await supabase
      .from('User')
      .update({ usedInvitations: user.usedInvitations + 1 })
      .eq('id', session.user.id)

    if (updateError) {
      console.error('Error updating user invitations:', updateError)
      // 招待は作成されているが、カウントの更新に失敗
      return NextResponse.json({ 
        invitation,
        message: 'Invitation created but failed to update count' 
      }, { status: 200 })
    }

    const result = invitation

    // 招待リンクを生成
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/invite/${invitationCode}`

    return NextResponse.json({
      invitation: {
        id: result.id,
        code: result.code,
        url: invitationUrl,
        expiresAt: result.expiresAt
      }
    })
  } catch (error) {
    console.error('Failed to create invitation:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
