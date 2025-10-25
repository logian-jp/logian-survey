import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // アンケートIDから画像データを取得
    const survey = await prisma.survey.findUnique({
      where: { id: params.id },
      select: {
        ogImageUrl: true,
        headerImageUrl: true,
        title: true
      }
    })

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    // URLパラメータから画像タイプを取得
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'og' or 'header'

    let imageData: string | null = null

    if (type === 'og' && survey.ogImageUrl) {
      imageData = survey.ogImageUrl
    } else if (type === 'header' && survey.headerImageUrl) {
      imageData = survey.headerImageUrl
    }

    if (!imageData) {
      return NextResponse.json({ message: 'Image not found' }, { status: 404 })
    }

    // Base64データの場合
    if (imageData.startsWith('data:')) {
      const [header, base64Data] = imageData.split(',')
      const mimeType = header.split(':')[1].split(';')[0]
      
      const buffer = Buffer.from(base64Data, 'base64')
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': buffer.length.toString(),
        },
      })
    }

    // 通常のURLの場合（フォールバック）
    return NextResponse.redirect(imageData)
  } catch (error) {
    console.error('Image serving error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
