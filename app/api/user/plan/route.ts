import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email)

    // メールアドレスでユーザーを検索
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Found user ID:', user.id)

    let userPlan = await prisma.userPlan.findUnique({
      where: { userId: user.id }
    })

    // プランが存在しない場合は無料プランを作成
    if (!userPlan) {
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

    return NextResponse.json(userPlan)
  } catch (error) {
    console.error('Failed to fetch user plan:', error)
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
