import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const surveys = await prisma.survey.findMany({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(surveys)
  } catch (error) {
    console.error('Error fetching user surveys:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
