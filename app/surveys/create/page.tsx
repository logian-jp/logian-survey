'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import RichTextEditor from '@/components/RichTextEditor'
import ConditionalLogicEditor from '@/components/ConditionalLogicEditor'
import { ConditionalLogic } from '@/types/conditional'

interface Question {
  id: string
  type: string
  title: string
  description?: string
  required: boolean
  order: number
  options?: string[]
  settings?: {
    ordinalStructure?: boolean
    naHandling?: 'keep' | 'remove' | 'replace'
    naValue?: string
    allowedFileTypes?: string[]
  }
  conditions?: ConditionalLogic
}

export default function CreateSurvey() {
  const { data: session } = useSession()
  const router = useRouter()
  const [survey, setSurvey] = useState({
    title: '',
    description: '',
  })
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const questionTypes = [
    { value: 'TEXT', label: 'テキスト入力' },
    { value: 'TEXTAREA', label: '長文テキスト' },
    { value: 'NUMBER', label: '数値入力' },
    { value: 'EMAIL', label: 'メールアドレス' },
    { value: 'PHONE', label: '電話番号' },
    { value: 'DATE', label: '日付' },
    { value: 'RADIO', label: '単一選択（ラジオボタン）' },
    { value: 'CHECKBOX', label: '複数選択（チェックボックス）' },
    { value: 'SELECT', label: '単一選択（ドロップダウン）' },
    { value: 'RATING', label: '評価' },
    { value: 'PREFECTURE', label: '都道府県' },
    { value: 'NAME', label: '名前' },
    { value: 'AGE_GROUP', label: '年代' },
    { value: 'LOCATION', label: '位置情報' },
    { value: 'FILE_UPLOAD', label: 'ファイルアップロード' },
  ]

  const fileTypeOptions = [
    { value: 'image', label: '画像系', extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'] },
    { value: 'video', label: '動画系', extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'] },
    { value: 'pdf', label: 'PDF', extensions: ['.pdf'] },
    { value: 'python', label: 'Python', extensions: ['.py', '.pyw', '.pyc', '.pyo'] },
    { value: 'r', label: 'R', extensions: ['.r', '.R', '.RData', '.rds'] },
    { value: 'document', label: '文書', extensions: ['.doc', '.docx', '.txt', '.rtf'] },
    { value: 'spreadsheet', label: '表計算', extensions: ['.xls', '.xlsx', '.csv'] },
    { value: 'presentation', label: 'プレゼンテーション', extensions: ['.ppt', '.pptx'] },
    { value: 'archive', label: 'アーカイブ', extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'] },
    { value: 'code', label: 'コード', extensions: ['.js', '.ts', '.html', '.css', '.json', '.xml', '.sql'] },
  ]

  const addQuestion = (insertIndex?: number) => {
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      type: 'TEXT',
      title: '',
      required: false,
      order: insertIndex !== undefined ? insertIndex : questions.length,
      settings: {
        ordinalStructure: false,
        naHandling: 'keep',
      }
    }

    if (insertIndex !== undefined) {
      // 指定位置に挿入
      const newQuestions = [...questions]
      newQuestions.splice(insertIndex, 0, newQuestion)
      // 順序を再設定
      newQuestions.forEach((q, index) => {
        q.order = index
      })
      setQuestions(newQuestions)
    } else {
      // 最後に追加
      setQuestions([...questions, newQuestion])
    }
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        const updatedQuestion = { ...q, ...updates }
        
        // 評価タイプに変更した場合、デフォルト選択肢を設定
        if (updates.type === 'RATING' && !updatedQuestion.options) {
          updatedQuestion.options = ['1', '2', '3', '4', '5']
        }
        
        // 都道府県タイプに変更した場合、選択肢をクリア
        if (updates.type === 'PREFECTURE') {
          updatedQuestion.options = undefined
        }
        
        // 年代タイプに変更した場合、選択肢をクリア
        if (updates.type === 'AGE_GROUP') {
          updatedQuestion.options = undefined
        }
        
        // 名前タイプに変更した場合、選択肢をクリア
        if (updates.type === 'NAME') {
          updatedQuestion.options = undefined
        }
        
        return updatedQuestion
      }
      return q
    }))
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === id)
    if (direction === 'up' && index > 0) {
      const newQuestions = [...questions]
      const temp = newQuestions[index - 1]
      newQuestions[index - 1] = newQuestions[index]
      newQuestions[index] = temp
      setQuestions(newQuestions)
    } else if (direction === 'down' && index < questions.length - 1) {
      const newQuestions = [...questions]
      const temp = newQuestions[index]
      newQuestions[index] = newQuestions[index + 1]
      newQuestions[index + 1] = temp
      setQuestions(newQuestions)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // アンケート作成
      const surveyResponse = await fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(survey),
      })

      if (!surveyResponse.ok) {
        throw new Error('Failed to create survey')
      }

      const createdSurvey = await surveyResponse.json()

      // 質問作成
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i]
        await fetch('/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            surveyId: createdSurvey.id,
            ...question,
            order: i,
          }),
        })
      }

      router.push(`/surveys/${createdSurvey.id}/edit`)
    } catch (error) {
      console.error('Failed to create survey:', error)
      alert('アンケートの作成に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">ログインが必要です</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              新しいアンケートを作成
            </h1>
            <Link
              href="/surveys"
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              一覧に戻る
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* アンケート基本情報 */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    アンケートタイトル *
                  </label>
                  <input
                    type="text"
                    id="title"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    value={survey.title}
                    onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
                    placeholder="例：顧客満足度調査"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    説明
                  </label>
                  <RichTextEditor
                    value={survey.description || ''}
                    onChange={(value) => setSurvey({ ...survey, description: value })}
                    placeholder="アンケートの目的や内容について説明してください"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* 質問一覧 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">質問</h2>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    質問を追加
                  </button>
                </div>

                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div key={question.id}>
                      {/* 質問間の追加ボタン */}
                      {index === 0 && (
                        <div className="relative group mb-6">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                addQuestion(index)
                              }}
                              className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors"
                              title="ここに質問を追加"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                          <div className="h-8 border-l-2 border-dashed border-gray-300 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      )}

                      <div className="border border-gray-300 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                            質問 {index + 1}
                          </span>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => moveQuestion(question.id, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(question.id, 'down')}
                              disabled={index === questions.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(question.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              削除
                            </button>
                          </div>
                        </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            質問タイプ
                          </label>
                          <select
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            value={question.type}
                            onChange={(e) => updateQuestion(question.id, { type: e.target.value })}
                          >
                            {questionTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            質問文 *
                          </label>
                          <input
                            type="text"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            value={question.title}
                            onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
                            placeholder="質問を入力してください"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            説明（任意）
                          </label>
                          <input
                            type="text"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            value={question.description || ''}
                            onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
                            placeholder="追加の説明があれば入力してください"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`required-${question.id}`}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            checked={question.required}
                            onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                          />
                          <label htmlFor={`required-${question.id}`} className="ml-2 block text-sm text-gray-700">
                            必須項目
                          </label>
                        </div>

                        {/* 分析設定 */}
                        {['RADIO', 'CHECKBOX', 'SELECT', 'RATING', 'PREFECTURE', 'AGE_GROUP'].includes(question.type) && (
                          <div className="border-t pt-4 space-y-4">
                            <h4 className="text-sm font-medium text-gray-700">分析設定</h4>
                            
                            {['RADIO', 'CHECKBOX', 'SELECT', 'RATING'].includes(question.type) && (
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`ordinal-${question.id}`}
                                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                  checked={question.settings?.ordinalStructure || false}
                                  onChange={(e) => updateQuestion(question.id, {
                                    settings: { ...question.settings, ordinalStructure: e.target.checked }
                                  })}
                                />
                                <label htmlFor={`ordinal-${question.id}`} className="ml-2 block text-sm text-gray-700">
                                  順序構造があるカテゴリ変数（例：満足度、重要度）
                                </label>
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                NA（欠損値）の取り扱い
                              </label>
                              <select
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                value={question.settings?.naHandling || 'keep'}
                                onChange={(e) => updateQuestion(question.id, {
                                  settings: { ...question.settings, naHandling: e.target.value as 'keep' | 'remove' | 'replace' }
                                })}
                              >
                                <option value="keep">保持する</option>
                                <option value="remove">行を削除する</option>
                                <option value="replace">指定値で置換する</option>
                              </select>
                            </div>

                            {question.settings?.naHandling === 'replace' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  置換値
                                </label>
                                <input
                                  type="text"
                                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                  value={question.settings?.naValue || ''}
                                  onChange={(e) => updateQuestion(question.id, {
                                    settings: { ...question.settings, naValue: e.target.value }
                                  })}
                                  placeholder="例：不明、その他"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* 選択肢設定 */}
                        {['RADIO', 'CHECKBOX', 'SELECT', 'RATING'].includes(question.type) && (
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">選択肢</h4>
                            <div className="space-y-2">
                              {(question.options || []).map((option, optionIndex) => (
                                <div key={optionIndex} className="flex space-x-2">
                                  <input
                                    type="text"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...(question.options || [])]
                                      newOptions[optionIndex] = e.target.value
                                      updateQuestion(question.id, { options: newOptions })
                                    }}
                                    placeholder={`選択肢 ${optionIndex + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newOptions = (question.options || []).filter((_, i) => i !== optionIndex)
                                      updateQuestion(question.id, { options: newOptions })
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    削除
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const newOptions = [...(question.options || []), '']
                                  updateQuestion(question.id, { options: newOptions })
                                }}
                                className="text-primary hover:text-primary/80 text-sm"
                              >
                                + 選択肢を追加
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ファイルアップロード設定 */}
                        {question.type === 'FILE_UPLOAD' && (
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">許可するファイル形式</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {fileTypeOptions.map((fileType) => (
                                <label key={fileType.value} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={question.settings?.allowedFileTypes?.includes(fileType.value) || false}
                                    onChange={(e) => {
                                      const currentTypes = question.settings?.allowedFileTypes || []
                                      const newTypes = e.target.checked
                                        ? [...currentTypes, fileType.value]
                                        : currentTypes.filter(type => type !== fileType.value)
                                      updateQuestion(question.id, {
                                        settings: { ...question.settings, allowedFileTypes: newTypes }
                                      })
                                    }}
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                  />
                                  <span className="text-sm text-gray-700">{fileType.label}</span>
                                </label>
                              ))}
                            </div>
                            {question.settings?.allowedFileTypes?.length > 0 && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800 font-medium mb-2">許可されるファイル形式:</p>
                                <div className="flex flex-wrap gap-1">
                                  {question.settings.allowedFileTypes.map(fileType => {
                                    const option = fileTypeOptions.find(opt => opt.value === fileType)
                                    return option?.extensions.map(ext => (
                                      <span key={ext} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                        {ext}
                                      </span>
                                    ))
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 条件分岐設定 */}
                        <div className="border-t pt-4">
                          <ConditionalLogicEditor
                            conditions={question.conditions || { enabled: false, rules: [], showIf: 'all' }}
                            onChange={(conditions) => updateQuestion(question.id, { conditions })}
                            availableQuestions={questions
                              .filter(q => q.id !== question.id && q.order < question.order)
                              .map(q => ({ id: q.id, title: q.title, type: q.type }))}
                            currentQuestionId={question.id}
                          />
                        </div>
                      </div>

                      {/* 質問間の追加ボタン（最後の質問以外） */}
                      {index < questions.length - 1 && (
                        <div className="relative group mt-6">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                addQuestion(index + 1)
                              }}
                              className="bg-primary text-primary-foreground rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors"
                              title="ここに質問を追加"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                          <div className="h-8 border-l-2 border-dashed border-gray-300 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      )}
                    </div>
                    </div>
                  ))}

                  {/* 最後に質問を追加するボタン */}
                  <div className="flex justify-center pt-6">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        addQuestion()
                      }}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>質問を追加</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 送信ボタン */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !survey.title || questions.length === 0}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isLoading ? '作成中...' : 'アンケートを作成'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
