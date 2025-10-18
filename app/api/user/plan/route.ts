import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('=== /api/user/plan API called ===')
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session)

    if (!session?.user?.id) {
      console.log('No session or user ID, returning 401')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)

    // メールアドレスでユーザーを検索
    console.log('Searching for user with email:', session.user.email)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      console.log('User not found in database')
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Found user ID:', user.id)

    console.log('Searching for user plan with userId:', user.id)
    let userPlan = await prisma.userPlan.findUnique({
      where: { userId: user.id }
    })

    console.log('Found user plan:', userPlan)

    // プランが存在しない場合は無料プランを作成
    if (!userPlan) {
      console.log('No user plan found, creating FREE plan')
      try {
        userPlan = await prisma.userPlan.create({
          data: {
            userId: user.id,
            planType: 'FREE',
            status: 'ACTIVE'
          }
        })
        console.log('Created new FREE plan for user:', user.id)
      } catch (error) {
        console.error('Failed to create user plan:', error)
        // データベースエラーの場合は仮想的な無料プランを返す
        userPlan = {
          id: 'temp-free-plan',
          userId: user.id,
          planType: 'FREE',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    }

    console.log('Returning user plan:', userPlan)
    return NextResponse.json(userPlan)
  } catch (error) {
    console.error('=== /api/user/plan API ERROR ===')
    console.error('Error details:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    // エラーの場合も無料プランを返す
    return NextResponse.json({
      id: 'fallback-free-plan',
      userId: 'unknown',
      planType: 'FREE',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }
}
