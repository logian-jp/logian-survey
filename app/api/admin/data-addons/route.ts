import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addons = await prisma.dataStorageAddon.findMany({
      orderBy: [
        { type: 'asc' },
        { amount: 'asc' }
      ]
    })

    return NextResponse.json(addons)
  } catch (error) {
    console.error('Error fetching data addons:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, type, amount, price, stripeProductId, stripePriceId, isActive, isMonthly } = body

    const addon = await prisma.dataStorageAddon.create({
      data: {
        name,
        description,
        type,
        amount,
        price,
        stripeProductId,
        stripePriceId,
        isActive: isActive !== undefined ? isActive : true,
        isMonthly: isMonthly !== undefined ? isMonthly : false
      }
    })

    return NextResponse.json(addon)
  } catch (error) {
    console.error('Error creating data addon:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
