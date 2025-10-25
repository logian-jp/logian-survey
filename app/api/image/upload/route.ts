import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: '画像ファイルが選択されていません' }, { status: 400 })
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE / (1024 * 1024)}MBまでです。` 
      }, { status: 400 })
    }

    // ファイル形式チェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: '対応していないファイル形式です。JPEGまたはPNG形式の画像をアップロードしてください。' 
      }, { status: 400 })
    }

    // ファイル名を生成（重複を避けるためタイムスタンプを使用）
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `image_${timestamp}.${fileExtension}`

    // アップロードディレクトリの作成
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'images')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // ファイルを保存
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 公開URLを返す
    const publicUrl = `/uploads/images/${fileName}`

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: fileName,
      size: file.size
    })

  } catch (error) {
    console.error('画像アップロードエラー:', error)
    return NextResponse.json({ 
      error: '画像のアップロードに失敗しました' 
    }, { status: 500 })
  }
}
