import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    // 招待統計を取得
    const invitationStats = await prisma.invitation.findMany({
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        usedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 統計サマリーを計算
    const totalInvitations = invitationStats.length
    const usedInvitations = invitationStats.filter(inv => inv.isUsed).length
    const pendingInvitations = totalInvitations - usedInvitations
    const successRate = totalInvitations > 0 ? (usedInvitations / totalInvitations) * 100 : 0

    // 招待者別統計
    const inviterStats = await prisma.user.findMany({
      where: {
        invitations: {
          some: {}
        }
      },
      include: {
        invitations: {
          include: {
            usedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    const inviterBreakdown = inviterStats.map(inviter => {
      const totalInvited = inviter.invitations.length
      const successfulInvites = inviter.invitations.filter(inv => inv.isUsed).length
      return {
        inviterId: inviter.id,
        inviterName: inviter.name || inviter.email,
        inviterEmail: inviter.email,
        totalInvited,
        successfulInvites,
        successRate: totalInvited > 0 ? (successfulInvites / totalInvited) * 100 : 0
      }
    })

    return NextResponse.json({
      summary: {
        totalInvitations,
        usedInvitations,
        pendingInvitations,
        successRate: Math.round(successRate * 100) / 100
      },
      invitations: invitationStats,
      inviterBreakdown
    })
  } catch (error) {
    console.error('Failed to fetch invitation stats:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
