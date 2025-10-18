import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({
      session: session,
      user: session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })
  } catch (error) {
    console.error('Session debug error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
