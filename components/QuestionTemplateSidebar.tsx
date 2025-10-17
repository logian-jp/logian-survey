'use client'

import { useState, useEffect } from 'react'
import { QuestionType } from '@prisma/client'

interface QuestionTemplate {
  id: string
  title: string
  description?: string
  type: QuestionType
  required: boolean
  options?: any
  settings?: any
  conditions?: any
  isPublic: boolean
  usageCount: number
  user: {
    id: string
    name?: string
    email: string
  }
}

interface QuestionTemplateSidebarProps {
  onTemplateSelect: (template: QuestionTemplate) => void
  onSaveAsTemplate: (question: any) => void
  currentQuestion?: any
}

export default function QuestionTemplateSidebar({
  onTemplateSelect,
  onSaveAsTemplate,
  currentQuestion
}: QuestionTemplateSidebarProps) {
  const [templates, setTemplates] = useState<QuestionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showPublic, setShowPublic] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateIsPublic, setTemplateIsPublic] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [showPublic])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/question-templates?includePublic=${showPublic}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('テンプレート取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!currentQuestion || !templateTitle.trim()) return

    try {
      const response = await fetch('/api/question-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: templateTitle,
          description: currentQuestion.description,
          type: currentQuestion.type,
          required: currentQuestion.required,
          options: currentQuestion.options,
          settings: currentQuestion.settings,
          conditions: currentQuestion.conditions,
          isPublic: templateIsPublic
        })
      })

      if (response.ok) {
        setShowSaveDialog(false)
        setTemplateTitle('')
        setTemplateIsPublic(false)
        fetchTemplates()
        alert('テンプレートとして保存しました！')
      } else {
        alert('テンプレートの保存に失敗しました')
      }
    } catch (error) {
      console.error('テンプレート保存エラー:', error)
      alert('テンプレートの保存に失敗しました')
    }
  }

  const handleTemplateUse = async (template: QuestionTemplate) => {
    try {
      // 使用回数を増加
      await fetch(`/api/question-templates/${template.id}/use`, {
        method: 'POST'
      })
      
      // テンプレートを選択
      onTemplateSelect(template)
    } catch (error) {
      console.error('テンプレート使用エラー:', error)
    }
  }

  const getQuestionTypeLabel = (type: QuestionType) => {
    const typeLabels: Record<QuestionType, string> = {
      TEXT: 'テキスト',
      TEXTAREA: '長文テキスト',
      NUMBER: '数値',
      EMAIL: 'メールアドレス',
      PHONE: '電話番号',
      DATE: '日付',
      RADIO: '単一選択',
      CHECKBOX: '複数選択',
      SELECT: 'プルダウン',
      RATING: '評価',
      PREFECTURE: '都道府県',
      NAME: '名前',
      AGE_GROUP: '年代',
      LOCATION: '位置情報',
      FILE_UPLOAD: 'ファイルアップロード'
    }
    return typeLabels[type] || type
  }

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">質問テンプレート</h3>
        
        {/* 検索バー */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="テンプレートを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary text-sm"
          />
        </div>

        {/* 公開テンプレート表示切り替え */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="showPublic"
            checked={showPublic}
            onChange={(e) => setShowPublic(e.target.checked)}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="showPublic" className="ml-2 block text-sm text-gray-700">
            公開テンプレートも表示
          </label>
        </div>

        {/* 現在の質問をテンプレートとして保存 */}
        {currentQuestion && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm mb-4"
          >
            現在の質問をテンプレートとして保存
          </button>
        )}
      </div>

      {/* テンプレート一覧 */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">読み込み中...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">テンプレートが見つかりません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all cursor-pointer"
                onClick={() => handleTemplateUse(template)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify(template))
                  e.dataTransfer.effectAllowed = 'copy'
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                    {template.title}
                  </h4>
                  <div className="flex items-center space-x-1 ml-2">
                    {template.isPublic && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        公開
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {template.usageCount}回使用
                    </span>
                  </div>
                </div>
                
                {template.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {template.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {getQuestionTypeLabel(template.type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {template.user.name || template.user.email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* テンプレート保存ダイアログ */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              テンプレートとして保存
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  テンプレート名
                </label>
                <input
                  type="text"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  placeholder="テンプレート名を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="templateIsPublic"
                  checked={templateIsPublic}
                  onChange={(e) => setTemplateIsPublic(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="templateIsPublic" className="ml-2 block text-sm text-gray-700">
                  公開テンプレートとして保存
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={!templateTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
