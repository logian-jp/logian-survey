import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Checking users in database...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        createdAt: true
      }
    })

    console.log(`Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`- ID: ${user.id}`)
      console.log(`  Name: ${user.name || 'N/A'}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Password: ${user.password ? 'SET' : 'NULL'}`)
      console.log(`  Role: ${user.role}`)
      console.log(`  Created: ${user.createdAt}`)
      console.log('---')
    })

    return NextResponse.json({
      count: users.length,
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password ? 'SET' : 'NULL',
        role: user.role,
        createdAt: user.createdAt
      }))
    })
  } catch (error) {
    console.error('Error checking users:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
