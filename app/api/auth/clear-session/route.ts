import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // セッションを無効化するために、データベースからセッションを削除
    const { prisma } = await import('@/lib/prisma')
    
    await prisma.session.deleteMany({
      where: {
        userId: session.user.id
      }
    })

    return NextResponse.json({ message: 'Session cleared successfully' })
  } catch (error) {
    console.error('Error clearing session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
