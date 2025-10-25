import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== User Detail API Called ===')
    console.log('User ID:', params.id)
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.email, session?.user?.role)

    if (!session || session.user?.role !== 'ADMIN') {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    console.log('Fetching user with ID:', userId)

    // ユーザー詳細情報を取得
    console.log('Starting user query...')
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            surveys: true,
            invitations: true,
            ticketPurchases: true
          }
        },
        surveys: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                responses: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        ticketPurchases: {
          select: {
            id: true,
            ticketType: true,
            amount: true,
            currency: true,
            createdAt: true,
            metadata: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        invitations: {
          select: {
            id: true,
            code: true,
            invitedEmail: true,
            isUsed: true,
            createdAt: true,
            usedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    })

    console.log('User query completed, user found:', !!user)

    if (!user) {
      console.log('User not found for ID:', userId)
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Returning user data')
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Failed to fetch user details:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
