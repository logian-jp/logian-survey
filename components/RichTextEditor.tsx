'use client'

import { useState, useRef, useEffect } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "説明を入力してください...",
  className = ""
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [textColor, setTextColor] = useState('#000000')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [isComposing, setIsComposing] = useState(false)

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

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    children, 
    title 
  }: { 
    onClick: () => void
    isActive: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
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
    </div>
  )
}
