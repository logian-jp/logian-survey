import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { id, email, name, image } = await request.json()

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ユーザーが既に存在するかチェック
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // 既存ユーザーの情報を更新
      await prisma.user.update({
        where: { email },
        data: {
          name: name || existingUser.name,
          image: image || existingUser.image,
          updatedAt: new Date()
        }
      })
    } else {
      // 新規ユーザーを作成
      await prisma.user.create({
        data: {
          id,
          email,
          name: name || email,
          image,
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })

      // TODO: チケット制度移行により、プラン設定を削除
      // デフォルトでチケット制度を使用（プラン設定不要）
      /*
      await prisma.userPlan.create({
        data: {
          userId: id,
          planType: 'FREE',
          status: 'ACTIVE',
          startDate: new Date()
        }
      })
      */
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
