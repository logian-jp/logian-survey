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
  onClose?: () => void
}

export default function QuestionTemplateSidebar({
  onTemplateSelect,
  onSaveAsTemplate,
  currentQuestion,
  onClose
}: QuestionTemplateSidebarProps) {
  const [templates, setTemplates] = useState<QuestionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showPublic, setShowPublic] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateIsPublic, setTemplateIsPublic] = useState(false)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [showPublic])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/question-templates?includePublic=${showPublic}`)
      if (response.ok) {
        const data = await response.json()
        // デフォルトテンプレートを優先表示するようにソート
        const sortedData = data.sort((a: QuestionTemplate, b: QuestionTemplate) => {
          const aIsDefault = a.title.startsWith('[デフォルト]')
          const bIsDefault = b.title.startsWith('[デフォルト]')
          
          if (aIsDefault && !bIsDefault) return -1
          if (!aIsDefault && bIsDefault) return 1
          
          // デフォルトテンプレート内では使用回数順
          if (aIsDefault && bIsDefault) {
            return b.usageCount - a.usageCount
          }
          
          // その他は使用回数順
          return b.usageCount - a.usageCount
        })
        setTemplates(sortedData)
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
      FILE_UPLOAD: 'ファイルアップロード',
      SECTION: 'セクション',
      PAGE_BREAK: '改ページ'
    }
    return typeLabels[type] || type
  }

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // 検索結果でもデフォルトテンプレートを優先表示
    const aIsDefault = a.title.startsWith('[デフォルト]')
    const bIsDefault = b.title.startsWith('[デフォルト]')
    
    if (aIsDefault && !bIsDefault) return -1
    if (!aIsDefault && bIsDefault) return 1
    
    return 0
  })

  const toggleExpanded = (templateId: string) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId)
  }

  const renderTemplatePreview = (template: QuestionTemplate) => {
    if (expandedTemplate !== template.id) return null

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="space-y-2 text-xs">
          {/* 質問文 */}
          <div>
            <span className="font-medium text-gray-700">質問文:</span>
            <p className="text-gray-600 mt-1">{template.title}</p>
          </div>

          {/* 説明 */}
          {template.description && (
            <div>
              <span className="font-medium text-gray-700">説明:</span>
              <p className="text-gray-600 mt-1">{template.description}</p>
            </div>
          )}

          {/* 選択肢 */}
          {Array.isArray(template.options) && template.options.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">選択肢:</span>
              <ul className="mt-1 space-y-1">
                {template.options.map((option, index) => (
                  <li key={index} className="text-gray-600">
                    {index + 1}. {option}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ファイルアップロード設定 */}
          {template.type === 'FILE_UPLOAD' && template.settings?.allowedFileTypes && (
            <div>
              <span className="font-medium text-gray-700">許可ファイル形式:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {template.settings.allowedFileTypes.map((fileType: string) => (
                  <span key={fileType} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {fileType}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 分析設定 */}
          {template.settings && (
            <div>
              <span className="font-medium text-gray-700">分析設定:</span>
              <div className="mt-1 space-y-1">
                {template.settings.ordinalStructure && (
                  <div className="text-gray-600">✓ 順序構造あり</div>
                )}
                {template.settings.naHandling && (
                  <div className="text-gray-600">
                    NA処理: {template.settings.naHandling === 'keep' ? '保持' : 
                             template.settings.naHandling === 'remove' ? '行削除' : '置換'}
                  </div>
                )}
                {template.settings.naValue && (
                  <div className="text-gray-600">置換値: {template.settings.naValue}</div>
                )}
              </div>
            </div>
          )}

          {/* 条件分岐 */}
          {template.conditions && template.conditions.enabled && (
            <div>
              <span className="font-medium text-gray-700">条件分岐:</span>
              <div className="mt-1 text-gray-600">
                {template.conditions.rules?.length > 0 ? (
                  <div>
                    {template.conditions.showIf === 'all' ? 'すべて' : 'いずれか'}の条件を満たす場合に表示
                    <div className="mt-1 text-xs">
                      {template.conditions.rules.map((rule: any, index: number) => (
                        <div key={index} className="text-gray-500">
                          • {rule.questionTitle} {rule.operator} {rule.value || '値'}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>条件設定あり</div>
                )}
              </div>
            </div>
          )}

          {/* 必須設定 */}
          <div>
            <span className="font-medium text-gray-700">必須:</span>
            <span className="ml-1 text-gray-600">{template.required ? 'はい' : 'いいえ'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">質問テンプレート</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="mb-3 text-xs text-gray-500">
          サイドバーのテンプレートを「クリック」で追加、または「ドラッグ&ドロップ」で設問間や末尾に追加できます。
        </div>
        
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
                className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all"
              >
                <div 
                  className="cursor-pointer"
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
                  {/* プレビュー: オプションや設定の概要 */}
                  <div className="mb-2">
                    {Array.isArray(template.options) && template.options.length > 0 && (
                      <div className="text-[11px] text-gray-500">
                        選択肢: {template.options.slice(0, 5).join(' / ')}{template.options.length > 5 ? ' …' : ''}
                      </div>
                    )}
                    {template.type === 'FILE_UPLOAD' && template.settings?.allowedFileTypes && (
                      <div className="text-[11px] text-gray-500">
                        許可形式: {template.settings.allowedFileTypes.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getQuestionTypeLabel(template.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {template.user.name || template.user.email}
                    </span>
                  </div>
                </div>

                {/* 詳細表示ボタン */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(template.id)
                    }}
                    className="w-full text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center space-x-1"
                  >
                    <span>{expandedTemplate === template.id ? '詳細を隠す' : '詳細を表示'}</span>
                    <svg 
                      className={`w-3 h-3 transition-transform ${expandedTemplate === template.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* 詳細プレビュー */}
                {renderTemplatePreview(template)}
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
