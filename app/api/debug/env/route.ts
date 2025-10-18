import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Error getting environment variables', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
