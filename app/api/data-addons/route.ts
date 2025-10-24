import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'storage' または 'retention'

    const where = {
      isActive: true,
      ...(type && { type })
    }

    const addons = await prisma.dataStorageAddon.findMany({
      where,
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
