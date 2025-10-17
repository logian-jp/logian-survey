import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// 協力者の権限を更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; collaboratorId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id
    const collaboratorId = params.collaboratorId
    const { permission } = await request.json()

    if (!permission) {
      return NextResponse.json(
        { message: 'Permission is required' },
        { status: 400 }
      )
    }

    // アンケートの所有者かADMIN権限があるかチェック
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        OR: [
          { userId: session.user.id },
          {
            surveyUsers: {
              some: {
                userId: session.user.id,
                permission: 'ADMIN'
              }
            }
          }
        ]
      }
    })

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found or no permission' }, { status: 404 })
    }

    // 協力者を更新
    const updatedCollaborator = await prisma.surveyUser.update({
      where: {
        id: collaboratorId,
        surveyId: surveyId
      },
      data: {
        permission: permission as 'EDIT' | 'VIEW' | 'ADMIN'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

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
  { params }: { params: { id: string; collaboratorId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id
    const collaboratorId = params.collaboratorId

    // アンケートの所有者かADMIN権限があるかチェック
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        OR: [
          { userId: session.user.id },
          {
            surveyUsers: {
              some: {
                userId: session.user.id,
                permission: 'ADMIN'
              }
            }
          }
        ]
      }
    })

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found or no permission' }, { status: 404 })
    }

    // 協力者を削除
    await prisma.surveyUser.delete({
      where: {
        id: collaboratorId,
        surveyId: surveyId
      }
    })

    return NextResponse.json({ message: 'Collaborator removed successfully' })
  } catch (error) {
    console.error('Failed to remove collaborator:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
