import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function DELETE(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: '画像URLが指定されていません' }, { status: 400 })
    }

    // URLからファイル名を抽出
    const urlParts = imageUrl.split('/')
    const fileName = urlParts[urlParts.length - 1]

    if (!fileName) {
      return NextResponse.json({ error: '無効な画像URLです' }, { status: 400 })
    }

    // ファイルパスを構築
    const filePath = join(process.cwd(), 'public', 'uploads', 'images', fileName)

    // ファイルが存在するかチェック
    if (!existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      // ファイルが存在しない場合は成功として扱う（既に削除済み）
      return NextResponse.json({ success: true, message: 'ファイルは既に削除されています' })
    }

    // ファイルを削除
    await unlink(filePath)

    return NextResponse.json({ 
      success: true, 
      message: '画像ファイルを削除しました' 
    })

  } catch (error) {
    console.error('画像削除エラー:', error)
    return NextResponse.json({ 
      error: '画像の削除に失敗しました' 
    }, { status: 500 })
  }
}
