'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import RichTextEditor from '@/components/RichTextEditor'
import ConditionalLogicEditor from '@/components/ConditionalLogicEditor'
import QuestionTemplateSidebar from '@/components/QuestionTemplateSidebar'
import { ConditionalLogic } from '@/types/conditional'
import { PLAN_LIMITS } from '@/lib/plan-limits'

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
  const [showSidebar, setShowSidebar] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [survey, setSurvey] = useState({
    id: null as string | null,
    title: '',
    description: '',
    maxResponses: null as number | null,
    endDate: null as string | null,
    targetResponses: null as number | null,
  })
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userPlan, setUserPlan] = useState<any>(null)
  const [planLimit, setPlanLimit] = useState<{ allowed: boolean; message?: string }>({ allowed: true })

  useEffect(() => {
    if (session?.user?.id) {
      checkPlanLimit()
    }
  }, [session])

  const checkPlanLimit = async () => {
    try {
      const response = await fetch('/api/user/plan')
      if (response.ok) {
        const planData = await response.json()
        setUserPlan(planData)
        
        // アンケート作成数の制限チェック
        const surveyCountResponse = await fetch('/api/surveys')
        if (surveyCountResponse.ok) {
          const surveys = await surveyCountResponse.json()
          const currentCount = surveys.length
          const limits = PLAN_LIMITS[planData.planType]
          
          if (limits.maxSurveys !== -1 && currentCount >= limits.maxSurveys) {
            setPlanLimit({
              allowed: false,
              message: `アンケート作成数の上限（${limits.maxSurveys}個）に達しています。プランをアップグレードしてください。`
            })
          }
        }
      } else {
        // APIエラーの場合は無料プランとして処理
        console.warn('Failed to fetch user plan, using FREE plan as fallback')
        setUserPlan({
          id: 'fallback',
          planType: 'FREE',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null
        })
        
        // 無料プランの制限をチェック
        const surveyCountResponse = await fetch('/api/surveys')
        if (surveyCountResponse.ok) {
          const surveys = await surveyCountResponse.json()
          const currentCount = surveys.length
          const limits = PLAN_LIMITS.FREE
          
          if (limits.maxSurveys !== -1 && currentCount >= limits.maxSurveys) {
            setPlanLimit({
              allowed: false,
              message: `アンケート作成数の上限（${limits.maxSurveys}個）に達しています。プランをアップグレードしてください。`
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to check plan limit:', error)
      // エラーの場合は無料プランを設定
      setUserPlan({
        id: 'fallback',
        planType: 'FREE',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: null
      })
    }
  }

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
    { value: 'SECTION', label: 'セクション' },
    { value: 'PAGE_BREAK', label: '改ページ' },
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

  const addQuestion = (insertIndex?: number, questionType: string = 'TEXT') => {
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      type: questionType,
      title: questionType === 'PAGE_BREAK' ? '改ページ' : questionType === 'SECTION' ? 'セクション' : '',
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

  // テンプレートから質問を追加
  const handleTemplateSelect = (template: any) => {
    const newQuestion: Question = {
      id: `question_${Date.now()}`,
      type: template.type,
      title: template.title,
      description: template.description,
      required: template.required,
      order: questions.length,
      options: Array.isArray(template.options) ? template.options : template.options ?? undefined,
      settings: typeof template.settings === 'object' ? template.settings : template.settings ?? undefined,
      conditions: typeof template.conditions === 'object' ? template.conditions : template.conditions ?? undefined
    }
    
    setQuestions([...questions, newQuestion])
  }

  // ドラッグ&ドロップハンドラー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent, insertIndex?: number) => {
    e.preventDefault()
    
    try {
      const templateData = e.dataTransfer.getData('application/json')
      if (templateData) {
        const template = JSON.parse(templateData)
        const newQuestion: Question = {
          id: `question_${Date.now()}`,
          type: template.type,
          title: template.title,
          description: template.description,
          required: template.required,
          order: insertIndex !== undefined ? insertIndex : questions.length,
          options: Array.isArray(template.options) ? template.options : template.options ?? undefined,
          settings: typeof template.settings === 'object' ? template.settings : template.settings ?? undefined,
          conditions: typeof template.conditions === 'object' ? template.conditions : template.conditions ?? undefined
        }
        
        if (insertIndex !== undefined) {
          const newQuestions = [...questions]
          newQuestions.splice(insertIndex, 0, newQuestion)
          // 順序を更新
          newQuestions.forEach((question, index) => {
            question.order = index
          })
          setQuestions(newQuestions)
        } else {
          setQuestions([...questions, newQuestion])
        }
      }
    } catch (error) {
      console.error('ドロップ処理エラー:', error)
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

      // アンケートIDを設定
      setSurvey(prev => ({ ...prev, id: createdSurvey.id }))

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* メインコンテンツ */}
      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${showSidebar ? 'mr-80' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* プラン制限の警告 */}
          {!planLimit.allowed && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    プラン制限に達しています
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{planLimit.message}</p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/plans"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      プランをアップグレード
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                新しいアンケートを作成
              </h1>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  {showSidebar ? 'テンプレートを隠す' : 'テンプレートを表示'}
                </button>
                <Link
                  href="/surveys"
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  一覧に戻る
                </Link>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* アンケート基本情報 */}
                <div className="space-y-4">
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
                    allowVideo={true}
                    userPlan={userPlan?.planType || 'FREE'}
                  />
                </div>

                {/* プレビューボタン（アンケート保存後） */}
                {survey.id && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => window.open(`/survey/${survey.id}`, '_blank')}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      📱 プレビュー
                    </button>
                    <span className="text-sm text-gray-600 flex items-center">
                      💡 アンケートを保存するとプレビューできます
                    </span>
                  </div>
                )}

                {/* 回答設定 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">回答設定</h3>
                  
                  <div className="space-y-6">
                    {/* 回答数上限設定 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        回答数上限
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="number"
                          min="1"
                          value={survey.maxResponses || ''}
                          onChange={(e) => setSurvey({
                            ...survey,
                            maxResponses: e.target.value ? parseInt(e.target.value) : null
                          })}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                          placeholder="制限なし"
                        />
                        <span className="text-sm text-gray-500">
                          件（空白で制限なし）
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        設定した件数に達すると、自動的に回答受付を終了します
                      </p>
                    </div>

                    {/* 回答終了日時設定 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        回答終了日時
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="datetime-local"
                          value={survey.endDate ? new Date(survey.endDate).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setSurvey({
                            ...survey,
                            endDate: e.target.value ? new Date(e.target.value).toISOString() : null
                          })}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                        />
                        <button
                          onClick={() => setSurvey({ ...survey, endDate: null })}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          クリア
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        設定した日時に自動的に回答受付を終了します
                      </p>
                    </div>

                    {/* 回答数目標値設定 */}
                    {!survey.maxResponses && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          回答数目標値
                        </label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="number"
                            min="1"
                            value={survey.targetResponses || ''}
                            onChange={(e) => setSurvey({
                              ...survey,
                              targetResponses: e.target.value ? parseInt(e.target.value) : null
                            })}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                            placeholder="目標なし"
                          />
                          <span className="text-sm text-gray-500">
                            件（回答率計算用）
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          回答率の計算に使用されます。回答数上限を設定している場合は不要です
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 質問一覧 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">質問</h2>
                  <button
                    type="button"
                    onClick={() => addQuestion()}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    質問を追加
                  </button>
                </div>

                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div key={question.id}>
                      {/* 質問前のドロップゾーン */}
                      <div 
                        className="relative group mb-6"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                      >
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

                      {/* 質問本体 */}
                      <div 
                        onClick={() => setSelectedQuestion(question)}
                        className={`cursor-pointer ${selectedQuestion?.id === question.id ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <div className={`border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
                          question.type === 'SECTION' ? 'border-blue-300 bg-blue-50' :
                          question.type === 'PAGE_BREAK' ? 'border-orange-300 bg-orange-50' :
                          'border-gray-300 bg-white'
                        }`}>
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                            question.type === 'SECTION' ? 'text-blue-700 bg-blue-100' :
                            question.type === 'PAGE_BREAK' ? 'text-orange-700 bg-orange-100' :
                            'text-gray-700 bg-gray-100'
                          }`}>
                            {question.type === 'SECTION' ? 'セクション' :
                             question.type === 'PAGE_BREAK' ? '改ページ' :
                             `質問 ${index + 1}`}
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
                            {question.type === 'SECTION' ? 'セクションタイプ' :
                             question.type === 'PAGE_BREAK' ? '要素タイプ' :
                             '質問タイプ'}
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

                        {question.type === 'SECTION' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              セクション名
                            </label>
                            <input
                              type="text"
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                              value={question.title}
                              onChange={(e) => updateQuestion(question.id, { title: e.target.value })}
                              placeholder="セクション名を入力してください"
                            />
                          </div>
                        )}

                        {question.type === 'PAGE_BREAK' && (
                          <div className="text-center py-4">
                            <div className="text-gray-500 text-sm">
                              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                              </svg>
                              改ページ
                            </div>
                          </div>
                        )}

                        {question.type !== 'SECTION' && question.type !== 'PAGE_BREAK' && (
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
                        )}

                        {question.type !== 'SECTION' && question.type !== 'PAGE_BREAK' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                説明（任意）
                              </label>
                              <RichTextEditor
                                value={question.description || ''}
                                onChange={(value) => updateQuestion(question.id, { description: value })}
                                placeholder="追加の説明があれば入力してください（改行可能）"
                                className="min-h-[100px]"
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
                          </>
                        )}

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
                                <p className="text-xs text-gray-500 mt-1 ml-6">
                                  チェック時：1列の数値データ（1,2,3...）<br/>
                                  未チェック時：One-Hot Encoding（複数列の0/1データ）
                                </p>
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
                             {question.settings?.allowedFileTypes && question.settings.allowedFileTypes.length > 0 && (
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
                    </div>
                    </div>
                    </div>
                  ))}

                  {/* 最後の質問の後のドロップゾーン */}
                  <div 
                    className="relative group mt-6"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, questions.length)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          addQuestion()
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
                  disabled={isLoading || !survey.title || questions.length === 0 || !planLimit.allowed}
                  className={`px-6 py-2 rounded-md transition-colors disabled:opacity-50 ${
                    !planLimit.allowed 
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {isLoading ? '作成中...' : 
                   !planLimit.allowed ? 'プラン制限に達しています' : 
                   'アンケートを作成'}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      {/* テンプレートサイドバー */}
      {showSidebar && (
        <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 z-40">
          <QuestionTemplateSidebar
            onTemplateSelect={handleTemplateSelect}
            onSaveAsTemplate={(question) => {
              setSelectedQuestion(question)
              // テンプレート保存ダイアログはサイドバー内で処理
            }}
            currentQuestion={selectedQuestion}
            onClose={() => setShowSidebar(false)}
          />
        </div>
      )}
    </div>
  )
}
