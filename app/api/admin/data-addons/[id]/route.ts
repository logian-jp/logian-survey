import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/admin-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, type, amount, price, stripeProductId, stripePriceId, isActive, isMonthly } = body

    const addon = await prisma.dataStorageAddon.update({
      where: { id },
      data: {
        name,
        description,
        type,
        amount,
        price,
        stripeProductId,
        stripePriceId,
        isActive,
        isMonthly
      }
    })

    return NextResponse.json(addon)
  } catch (error) {
    console.error('Error updating data addon:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await prisma.dataStorageAddon.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting data addon:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
