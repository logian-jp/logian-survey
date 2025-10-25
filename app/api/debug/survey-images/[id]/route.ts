import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: (await params).id },
      select: {
        id: true,
        title: true,
        ogImageUrl: true,
        headerImageUrl: true,
        useCustomLogo: true
      }
    })

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    return NextResponse.json({
      survey: {
        id: survey.id,
        title: survey.title,
        ogImageUrl: survey.ogImageUrl,
        headerImageUrl: survey.headerImageUrl,
        useCustomLogo: survey.useCustomLogo,
        ogImageUrlType: survey.ogImageUrl ? (survey.ogImageUrl.startsWith('data:') ? 'base64' : 'url') : 'null',
        headerImageUrlType: survey.headerImageUrl ? (survey.headerImageUrl.startsWith('data:') ? 'base64' : 'url') : 'null'
      }
    })
  } catch (error) {
    console.error('Debug survey images error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
