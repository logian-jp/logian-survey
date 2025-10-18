'use client'

import { useState, useRef, useEffect } from 'react'
import { canUseVideoEmbedding } from '@/lib/plan-limits'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  allowVideo?: boolean
  userPlan?: string
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "説明を入力してください...",
  className = "",
  allowVideo = false,
  userPlan = 'FREE'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [textColor, setTextColor] = useState('#000000')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [isComposing, setIsComposing] = useState(false)
  const [headingLevel, setHeadingLevel] = useState<'normal' | 'h2' | 'h3' | 'h4'>('normal')
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoType, setVideoType] = useState<'youtube' | 'google-drive'>('youtube')
  const [videoPreview, setVideoPreview] = useState('')

  const colors = [
    { name: '黒', value: '#000000' },
    { name: '赤', value: '#ef4444' },
    { name: '青', value: '#3b82f6' },
    { name: '緑', value: '#22c55e' },
    { name: '黄', value: '#eab308' },
    { name: '紫', value: '#a855f7' },
    { name: 'ピンク', value: '#ec4899' },
    { name: 'オレンジ', value: '#f97316' },
  ]

  const backgroundColors = [
    { name: '白', value: '#ffffff' },
    { name: '薄い赤', value: '#fef2f2' },
    { name: '薄い青', value: '#eff6ff' },
    { name: '薄い緑', value: '#f0fdf4' },
    { name: '薄い黄', value: '#fefce8' },
    { name: '薄い紫', value: '#faf5ff' },
    { name: '薄いピンク', value: '#fdf2f8' },
    { name: '薄いオレンジ', value: '#fff7ed' },
  ]

  useEffect(() => {
    if (editorRef.current && !isComposing) {
      // 現在のカーソル位置を保存
      const selection = window.getSelection()
      let savedRange: Range | null = null
      
      if (selection && selection.rangeCount > 0) {
        try {
          savedRange = selection.getRangeAt(0).cloneRange()
        } catch (e) {
          // 範囲の保存に失敗した場合は何もしない
          return
        }
      }
      
      // 内容を更新
      const currentContent = editorRef.current.innerHTML
      if (currentContent !== value) {
        editorRef.current.innerHTML = value
        
        // カーソル位置を復元
        if (selection && savedRange) {
          try {
            // 少し遅延してカーソル位置を復元
            setTimeout(() => {
              if (editorRef.current && selection) {
                const newRange = document.createRange()
                
                // テキストノードを探す
                const walker = document.createTreeWalker(
                  editorRef.current,
                  NodeFilter.SHOW_TEXT,
                  null
                )
                
                let textNode = walker.nextNode()
                if (textNode) {
                  const textLength = textNode.textContent?.length || 0
                  const offset = Math.min(savedRange.startOffset, textLength)
                  newRange.setStart(textNode, offset)
                  newRange.setEnd(textNode, offset)
                  
                  selection.removeAllRanges()
                  selection.addRange(newRange)
                }
              }
            }, 10)
          } catch (e) {
            // カーソル位置の復元に失敗した場合は無視
          }
        }
      }
    }
  }, [value, isComposing])

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    updateToolbarState()
  }

  const setHeading = (level: 'normal' | 'h2' | 'h3' | 'h4') => {
    if (editorRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const container = range.commonAncestorContainer
        
        // 現在の見出しタグを取得
        let currentHeading = container.nodeType === Node.TEXT_NODE 
          ? container.parentElement 
          : container as Element
        
        // 見出しタグまで遡る
        while (currentHeading && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(currentHeading.tagName)) {
          currentHeading = currentHeading.parentElement
        }
        
        if (level === 'normal') {
          // 通常のテキストに変換
          if (currentHeading && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(currentHeading.tagName)) {
            const span = document.createElement('span')
            span.innerHTML = currentHeading.innerHTML
            currentHeading.parentNode?.replaceChild(span, currentHeading)
          }
        } else {
          // 見出しタグに変換
          const headingTag = level.toUpperCase()
          if (currentHeading && currentHeading.tagName !== headingTag) {
            const newHeading = document.createElement(headingTag)
            newHeading.innerHTML = currentHeading.innerHTML
            currentHeading.parentNode?.replaceChild(newHeading, currentHeading)
          } else if (!currentHeading) {
            // 選択されたテキストを見出しに変換
            const contents = range.extractContents()
            const heading = document.createElement(headingTag)
            heading.appendChild(contents)
            range.insertNode(heading)
          }
        }
        
        setHeadingLevel(level)
        onChange(editorRef.current.innerHTML)
      }
    }
  }

  const updateToolbarState = () => {
    if (editorRef.current) {
      setIsBold(document.queryCommandState('bold'))
      setIsItalic(document.queryCommandState('italic'))
      setIsUnderline(document.queryCommandState('underline'))
    }
  }

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current && !isComposing) {
      // 即座に内容を更新（カーソル位置を保持）
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 日本語入力中は何も処理しない
    if (isComposing) {
      return
    }
    
    // エンターキーの処理を完全に無効化
    // ブラウザのデフォルト動作に任せる
    if (e.key === 'Enter') {
      // 何もしない - ブラウザのデフォルト改行を使用
      return
    }
  }

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = () => {
    // 少し遅延してから日本語入力状態を解除
    setTimeout(() => {
      setIsComposing(false)
      // 日本語入力終了時に内容を更新
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }, 10)
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    // 日本語入力中は処理をスキップ
    if (isComposing) {
      return
    }
    
    // エンターキーを押した場合の特別処理
    if (e.key === 'Enter') {
      // カーソル位置を適切に設定
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        // カーソルが適切な位置にあることを確認
        if (range.collapsed) {
          // カーソルが折りたたまれている場合は何もしない
          return
        }
      }
    }
    
    updateToolbarState()
  }

  const generateVideoPreview = (url: string, type: string) => {
    if (!url.trim()) {
      setVideoPreview('')
      return
    }
    
    let previewHtml = ''
    
    if (type === 'youtube') {
      const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
      const match = url.match(youtubeRegex)
      if (match) {
        const videoId = match[1]
        previewHtml = `<div class="video-embed"><iframe width="100%" height="225" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="aspect-ratio: 16/9; max-width: 400px;"></iframe></div>`
      }
    } else if (type === 'google-drive') {
      const driveRegex = /drive\.google\.com\/file\/d\/([^\/]+)/
      const match = url.match(driveRegex)
      if (match) {
        const fileId = match[1]
        previewHtml = `<div class="video-embed"><iframe width="100%" height="225" src="https://drive.google.com/file/d/${fileId}/preview" frameborder="0" allowfullscreen style="aspect-ratio: 16/9; max-width: 400px;"></iframe></div>`
      }
    }
    
    setVideoPreview(previewHtml)
  }

  const insertVideo = () => {
    if (!videoUrl.trim()) return
    
    let embedHtml = ''
    
    if (videoType === 'youtube') {
      // YouTube URLから動画IDを抽出
      const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
      const match = videoUrl.match(youtubeRegex)
      if (match) {
        const videoId = match[1]
        embedHtml = `<div class="video-embed"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="aspect-ratio: 16/9; max-width: 560px;"></iframe></div>`
      } else {
        alert('有効なYouTube URLを入力してください')
        return
      }
    } else if (videoType === 'google-drive') {
      // Google Drive URLから埋め込み用URLに変換
      const driveRegex = /drive\.google\.com\/file\/d\/([^\/]+)/
      const match = videoUrl.match(driveRegex)
      if (match) {
        const fileId = match[1]
        embedHtml = `<div class="video-embed"><iframe width="100%" height="315" src="https://drive.google.com/file/d/${fileId}/preview" frameborder="0" allowfullscreen style="aspect-ratio: 16/9; max-width: 560px;"></iframe></div>`
      } else {
        alert('有効なGoogle Drive URLを入力してください')
        return
      }
    }
    
    if (embedHtml) {
      if (editorRef.current) {
        // 現在のエディタの内容を取得
        const currentContent = editorRef.current.innerHTML
        
        // 動画HTMLを追加（改行と一緒に）
        const newContent = currentContent ? `${currentContent}<br>${embedHtml}<br>` : embedHtml
        
        // エディタの内容を更新
        editorRef.current.innerHTML = newContent
        
        // カーソルを最後に移動
        const range = document.createRange()
        const selection = window.getSelection()
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
        }
        
        // onChangeを呼び出して状態を更新
        onChange(newContent)
      }
      
      setShowVideoModal(false)
      setVideoUrl('')
      setVideoPreview('')
    }
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    children, 
    title,
    className = ""
  }: { 
    onClick: () => void
    isActive: boolean
    children: React.ReactNode
    title: string
    className?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      } ${className}`}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <div className={`border border-gray-300 rounded-lg ${className}`}>
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-200 bg-gray-50">
        {/* テキストスタイル */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => execCommand('bold')}
            isActive={isBold}
            title="太字"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => execCommand('italic')}
            isActive={isItalic}
            title="斜体"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => execCommand('underline')}
            isActive={isUnderline}
            title="下線"
          >
            <u>U</u>
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* 見出し */}
        <div className="flex items-center gap-1">
          <select
            value={headingLevel}
            onChange={(e) => setHeading(e.target.value as 'normal' | 'h2' | 'h3' | 'h4')}
            className="px-2 py-1 text-sm border border-gray-300 rounded-md bg-white"
            title="見出しレベル"
          >
            <option value="normal">通常テキスト</option>
            <option value="h2">見出し2</option>
            <option value="h3">見出し3</option>
            <option value="h4">見出し4</option>
          </select>
        </div>

        {allowVideo && (
          <>
            <div className="w-px h-6 bg-gray-300"></div>

            {/* 動画埋め込み */}
            <div className="flex items-center gap-1">
              {canUseVideoEmbedding(userPlan) ? (
                <ToolbarButton
                  onClick={() => setShowVideoModal(true)}
                  isActive={false}
                  title="動画を埋め込み"
                >
                  📹 動画
                </ToolbarButton>
              ) : (
                <ToolbarButton
                  onClick={() => alert('動画埋め込み機能はプロフェッショナルプラン以上でご利用いただけます。')}
                  isActive={false}
                  title="動画埋め込み機能はプロフェッショナルプラン以上でご利用いただけます"
                  className="opacity-50 cursor-not-allowed"
                >
                  📹 動画
                </ToolbarButton>
              )}
            </div>

            <div className="w-px h-6 bg-gray-300"></div>
          </>
        )}

        {/* 文字色 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">文字色:</span>
          <div className="flex gap-1">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => {
                  setTextColor(color.value)
                  execCommand('foreColor', color.value)
                }}
                className={`w-6 h-6 rounded border-2 ${
                  textColor === color.value ? 'border-gray-400' : 'border-gray-200'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* 背景色 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">背景色:</span>
          <div className="flex gap-1">
            {backgroundColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => {
                  setBackgroundColor(color.value)
                  execCommand('backColor', color.value)
                }}
                className={`w-6 h-6 rounded border-2 ${
                  backgroundColor === color.value ? 'border-gray-400' : 'border-gray-200'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-gray-300"></div>

        {/* その他の機能 */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => execCommand('insertUnorderedList')}
            isActive={false}
            title="箇条書き"
          >
            • リスト
          </ToolbarButton>
          <ToolbarButton
            onClick={() => execCommand('insertOrderedList')}
            isActive={false}
            title="番号付きリスト"
          >
            1. リスト
          </ToolbarButton>
          <ToolbarButton
            onClick={() => execCommand('removeFormat')}
            isActive={false}
            title="書式をクリア"
          >
            クリア
          </ToolbarButton>
        </div>
      </div>

      {/* エディタ */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseUp={updateToolbarState}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        className="min-h-[120px] p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset prose prose-sm max-w-none"
        style={{ 
          color: textColor,
          backgroundColor: backgroundColor === '#ffffff' ? 'transparent' : backgroundColor
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>

      {/* 動画埋め込みモーダル */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">動画を埋め込み</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  動画タイプ
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="youtube"
                      checked={videoType === 'youtube'}
                      onChange={(e) => {
                        setVideoType(e.target.value as 'youtube' | 'google-drive')
                        generateVideoPreview(videoUrl, e.target.value)
                      }}
                      className="mr-2"
                    />
                    YouTube
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="google-drive"
                      checked={videoType === 'google-drive'}
                      onChange={(e) => {
                        setVideoType(e.target.value as 'youtube' | 'google-drive')
                        generateVideoPreview(videoUrl, e.target.value)
                      }}
                      className="mr-2"
                    />
                    Google Drive
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  動画URL
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value)
                    generateVideoPreview(e.target.value, videoType)
                  }}
                  placeholder={
                    videoType === 'youtube' 
                      ? 'https://www.youtube.com/watch?v=...' 
                      : 'https://drive.google.com/file/d/...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {videoType === 'youtube' 
                    ? 'YouTubeの動画URLを入力してください' 
                    : 'Google Driveの共有URLを入力してください'}
                </p>
              </div>

              {/* 動画プレビュー */}
              {videoPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    プレビュー
                  </label>
                  <div 
                    className="border border-gray-300 rounded-md p-4 bg-gray-50"
                    dangerouslySetInnerHTML={{ __html: videoPreview }}
                  />
                  <p className="text-xs text-green-600 mt-1">
                    ✅ 動画が正しく認識されました
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowVideoModal(false)
                  setVideoUrl('')
                  setVideoPreview('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={insertVideo}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
              >
                埋め込み
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}