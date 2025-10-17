import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// アンケートの協力者一覧を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id

    // アンケートの所有者または協力者かチェック
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        OR: [
          { userId: session.user.id },
          {
            surveyUsers: {
              some: {
                userId: session.user.id,
                permission: { in: ['EDIT', 'ADMIN', 'VIEW'] }
              }
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        surveyUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id
    const { email, permission } = await request.json()

    if (!email || !permission) {
      return NextResponse.json(
        { message: 'Email and permission are required' },
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

    // 招待するユーザーを検索
    const invitedUser = await prisma.user.findUnique({
      where: { email }
    })

    if (!invitedUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // 既に招待されているかチェック
    const existingInvitation = await prisma.surveyUser.findUnique({
      where: {
        userId_surveyId: {
          userId: invitedUser.id,
          surveyId: surveyId
        }
      }
    })

    if (existingInvitation) {
      return NextResponse.json({ message: 'User already invited' }, { status: 400 })
    }

    // 招待を作成
    const invitation = await prisma.surveyUser.create({
      data: {
        userId: invitedUser.id,
        surveyId: surveyId,
        permission: permission as 'EDIT' | 'VIEW' | 'ADMIN',
        invitedBy: session.user.id
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

    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    console.error('Failed to invite collaborator:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
