import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id

    // アンケートの所有者権限を確認
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        user: true
      }
    })

    if (!survey) {
      return NextResponse.json({ message: 'Survey not found' }, { status: 404 })
    }

    if (survey.userId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // エンタープライズプランの確認
    const userPlan = await prisma.userPlan.findFirst({
      where: { userId: session.user.id }
    })

    if (userPlan?.planType !== 'ENTERPRISE') {
      return NextResponse.json({ message: 'Enterprise plan required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file || !type) {
      return NextResponse.json({ message: 'File and type are required' }, { status: 400 })
    }

    // ファイルタイプの検証
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Only image files are allowed' }, { status: 400 })
    }

    // ファイルサイズの検証（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'File size must be less than 5MB' }, { status: 400 })
    }

    // ファイルを保存
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ディレクトリを作成
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'surveys', surveyId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // ファイル名を生成
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${type}_${timestamp}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // ファイルを保存
    await writeFile(filePath, buffer)

    // 画像URLを生成
    const imageUrl = `/uploads/surveys/${surveyId}/${fileName}`

    // データベースを更新
    const updateData: any = {}
    if (type === 'header') {
      updateData.headerImageUrl = imageUrl
    } else if (type === 'og') {
      updateData.ogImageUrl = imageUrl
    }

    await prisma.survey.update({
      where: { id: surveyId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
