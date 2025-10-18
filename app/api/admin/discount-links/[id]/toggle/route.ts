import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== Discount Link Toggle API ===')
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user?.email)
    
    if (!session?.user?.email) {
      console.log('No session, returning 401')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (session.user.email !== 'noutomi0729@gmail.com') {
      console.log('Not admin user, returning 403')
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { id } = params
    const { isActive } = await request.json()
    console.log('Toggle request:', { id, isActive })

    if (typeof isActive !== 'boolean') {
      console.log('Invalid isActive type:', typeof isActive)
      return NextResponse.json(
        { message: 'isActive must be a boolean' },
        { status: 400 }
      )
    }

    console.log('Updating discount link in database...')
    const updatedDiscountLink = await prisma.discountLink.update({
      where: { id },
      data: { isActive },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log('Successfully updated discount link:', updatedDiscountLink.id, 'isActive:', updatedDiscountLink.isActive)

    return NextResponse.json({
      success: true,
      discountLink: updatedDiscountLink
    })

  } catch (error) {
    console.error('=== Discount Link Toggle Error ===')
    console.error('Error details:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to toggle discount link',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
