import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (session.user.email !== 'noutomi0729@gmail.com') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    console.log('Creating dummy users on Vercel...')
    
    // ダミーユーザーを作成
    const dummyUsers = [
      {
        name: '田中太郎',
        email: 'tanaka@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG', // password123
        role: 'USER' as const
      },
      {
        name: '佐藤花子',
        email: 'sato@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG',
        role: 'USER' as const
      },
      {
        name: '鈴木一郎',
        email: 'suzuki@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG',
        role: 'USER' as const
      },
      {
        name: '高橋美咲',
        email: 'takahashi@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG',
        role: 'USER' as const
      },
      {
        name: '山田健太',
        email: 'yamada@example.com',
        password: '$2a$12$YighOovnfpquXOYbwH2Xx.zSQGt0qygXZOQluaoS8R3TJWJKxgIQG',
        role: 'USER' as const
      }
    ]
    
    const createdUsers = []
    
    for (const userData of dummyUsers) {
      try {
        const user = await prisma.user.create({
          data: userData
        })
        console.log(`Created user: ${user.name} (${user.email})`)
        
        // ユーザープランを作成（今月の日付で）
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        // ランダムなプランを割り当て
        const planTypes = ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE', 'ONETIME_UNLIMITED'] as const
        const randomPlan = planTypes[Math.floor(Math.random() * planTypes.length)]
        
        await prisma.userPlan.create({
          data: {
            userId: user.id,
            planType: randomPlan,
            status: 'ACTIVE',
            startDate: startOfMonth
          }
        })
        
        console.log(`  -> Assigned plan: ${randomPlan}`)
        createdUsers.push({ name: user.name, email: user.email, plan: randomPlan })
        
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`User ${userData.email} already exists, skipping...`)
        } else {
          console.error(`Error creating user ${userData.email}:`, error)
        }
      }
    }
    
    console.log('Dummy users creation completed!')
    
    return NextResponse.json({
      success: true,
      message: 'Dummy users created successfully',
      users: createdUsers
    })
    
  } catch (error) {
    console.error('Error creating dummy users:', error)
    return NextResponse.json(
      { message: 'Failed to create dummy users' },
      { status: 500 }
    )
  }
}
