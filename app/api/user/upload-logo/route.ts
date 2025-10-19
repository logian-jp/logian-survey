import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserPlan } from '@/lib/plan-limits'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // プランチェック
    const userPlan = await getUserPlan(session.user.id)
    if (userPlan?.planType !== 'ENTERPRISE') {
      return NextResponse.json({ message: 'Enterprise plan required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 })
    }

    // ファイルサイズ制限 (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'File size exceeds 5MB limit' }, { status: 400 })
    }

    // 画像ファイルのみ許可
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Only image files are allowed' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`
    
    // Vercel環境では一時的にメモリに保存し、データベースにBase64で保存
    const base64Data = buffer.toString('base64')
    const mimeType = file.type
    
    // データベースにBase64データとして保存
    const logoData = `data:${mimeType};base64,${base64Data}`

    // データベースを更新（Base64データを直接保存）
    await prisma.user.update({
      where: { id: session.user.id },
      data: { customLogoUrl: logoData },
    })

    return NextResponse.json({ success: true, logoUrl: logoData })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
