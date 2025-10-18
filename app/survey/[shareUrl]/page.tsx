'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Question {
  id: string
  type: string
  title: string
  description?: string
  required: boolean
  options?: string[]
  settings?: any
}

interface Survey {
  id: string
  title: string
  description?: string
  questions: Question[]
}

export default function SurveyPage() {
  const params = useParams()
  const router = useRouter()
  const shareUrl = params.shareUrl as string
  
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<{ [key: string]: string | string[] }>({})
  const [fileUploads, setFileUploads] = useState<{ [key: string]: File[] }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [locationLoading, setLocationLoading] = useState<{ [key: string]: boolean }>({})
  
  // ページ遷移用の状態
  const [currentPage, setCurrentPage] = useState(0)
  const [pages, setPages] = useState<{ questions: any[], pageNumber: number }[]>([])

  useEffect(() => {
    if (shareUrl) {
      fetchSurvey()
    }
  }, [shareUrl])

  // ページ分割ロジック
  useEffect(() => {
    if (survey?.questions) {
      const pageGroups: { questions: any[], pageNumber: number }[] = []
      let currentPageGroup: any[] = []
      let pageNumber = 1

      survey.questions.forEach((question) => {
        if (question.type === 'PAGE_BREAK') {
          if (currentPageGroup.length > 0) {
            pageGroups.push({ questions: currentPageGroup, pageNumber })
            currentPageGroup = []
            pageNumber++
          }
        } else if (question.type === 'SECTION') {
          // セクションタイトルを追加
          currentPageGroup.push({ ...question, isSection: true })
        } else {
          currentPageGroup.push(question)
        }
      })

      // 最後のページを追加
      if (currentPageGroup.length > 0) {
        pageGroups.push({ questions: currentPageGroup, pageNumber })
      }

      setPages(pageGroups)
    }
  }, [survey])

  const fetchSurvey = async () => {
    try {
      const response = await fetch(`/api/survey/${shareUrl}`)
      if (response.ok) {
        const data = await response.json()
        setSurvey(data)
        
        // 回答の初期化
        const initialAnswers: { [key: string]: string | string[] } = {}
        data.questions.forEach((question: Question) => {
          if (question.type === 'CHECKBOX') {
            initialAnswers[question.id] = []
          } else {
            initialAnswers[question.id] = ''
          }
        })
        setAnswers(initialAnswers)
      } else {
        setError('アンケートが見つかりません')
      }
    } catch (error) {
      setError('アンケートの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const getCurrentLocation = (questionId: string) => {
    if (!navigator.geolocation) {
      setError('このブラウザでは位置情報を取得できません')
      return
    }

    // ローディング状態を設定
    setLocationLoading(prev => ({ ...prev, [questionId]: true }))
    setError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const locationString = `${latitude},${longitude}`
        handleAnswerChange(questionId, locationString)
        setLocationLoading(prev => ({ ...prev, [questionId]: false }))
        console.log('位置情報取得成功:', { latitude, longitude })
      },
      (error) => {
        console.error('位置情報の取得に失敗しました:', error)
        setLocationLoading(prev => ({ ...prev, [questionId]: false }))
        
        let errorMessage = '位置情報の取得に失敗しました'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置情報の使用が拒否されました。ブラウザの設定で位置情報を許可してください。'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置情報が利用できません。GPSがオフになっている可能性があります。'
            break
          case error.TIMEOUT:
            errorMessage = '位置情報の取得がタイムアウトしました。もう一度お試しください。'
            break
          default:
            errorMessage = `位置情報の取得に失敗しました: ${error.message}`
            break
        }
        
        setError(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // タイムアウトを15秒に延長
        maximumAge: 30000 // キャッシュ時間を30秒に短縮
      }
    )
  }

  const getAcceptString = (allowedFileTypes: string[] | undefined) => {
    if (!allowedFileTypes || allowedFileTypes.length === 0) {
      return "image/*,.pdf,.doc,.docx,.txt"
    }

    const fileTypeOptions = [
      { value: 'image', extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'] },
      { value: 'video', extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'] },
      { value: 'pdf', extensions: ['.pdf'] },
      { value: 'python', extensions: ['.py', '.pyw', '.pyc', '.pyo'] },
      { value: 'r', extensions: ['.r', '.R', '.RData', '.rds'] },
      { value: 'document', extensions: ['.doc', '.docx', '.txt', '.rtf'] },
      { value: 'spreadsheet', extensions: ['.xls', '.xlsx', '.csv'] },
      { value: 'presentation', extensions: ['.ppt', '.pptx'] },
      { value: 'archive', extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'] },
      { value: 'code', extensions: ['.js', '.ts', '.html', '.css', '.json', '.xml', '.sql'] },
    ]

    const allowedExtensions = allowedFileTypes.flatMap(fileType => {
      const option = fileTypeOptions.find(opt => opt.value === fileType)
      return option?.extensions || []
    })

    return allowedExtensions.join(',')
  }

  const handleFileUpload = (questionId: string, files: FileList | null, allowedFileTypes: string[] | undefined) => {
    if (!files) return

    const fileArray = Array.from(files)
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    // ファイルサイズチェック
    const sizeValidFiles = fileArray.filter(file => file.size <= maxSize)
    if (sizeValidFiles.length !== fileArray.length) {
      setError('一部のファイルが10MBを超えているため、アップロードできません')
    }

    // ファイル形式チェック
    let validFiles = sizeValidFiles
    if (allowedFileTypes && allowedFileTypes.length > 0) {
      const fileTypeOptions = [
        { value: 'image', extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'] },
        { value: 'video', extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'] },
        { value: 'pdf', extensions: ['.pdf'] },
        { value: 'python', extensions: ['.py', '.pyw', '.pyc', '.pyo'] },
        { value: 'r', extensions: ['.r', '.R', '.RData', '.rds'] },
        { value: 'document', extensions: ['.doc', '.docx', '.txt', '.rtf'] },
        { value: 'spreadsheet', extensions: ['.xls', '.xlsx', '.csv'] },
        { value: 'presentation', extensions: ['.ppt', '.pptx'] },
        { value: 'archive', extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'] },
        { value: 'code', extensions: ['.js', '.ts', '.html', '.css', '.json', '.xml', '.sql'] },
      ]

      const allowedExtensions = allowedFileTypes.flatMap(fileType => {
        const option = fileTypeOptions.find(opt => opt.value === fileType)
        return option?.extensions || []
      })

      validFiles = sizeValidFiles.filter(file => {
        const extension = '.' + file.name.split('.').pop()?.toLowerCase()
        return allowedExtensions.includes(extension)
      })

      if (validFiles.length !== sizeValidFiles.length) {
        setError('一部のファイルが許可されていない形式です')
      }
    }

    setFileUploads(prev => ({
      ...prev,
      [questionId]: validFiles
    }))

    // ファイル名を回答として保存
    const fileNames = validFiles.map(file => file.name).join(',')
    handleAnswerChange(questionId, fileNames)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // 必須項目のチェック
      const requiredQuestions = survey?.questions.filter(q => q.required) || []
      const missingAnswers = requiredQuestions.filter(q => {
        const answer = answers[q.id]
        return !answer || (Array.isArray(answer) && answer.length === 0)
      })

      if (missingAnswers.length > 0) {
        setError('必須項目を入力してください')
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: survey?.id,
          answers: answers,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        setError('送信に失敗しました')
      }
    } catch (error) {
      setError('送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const isLastPage = currentPage === pages.length - 1
  const isFirstPage = currentPage === 0

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            回答を送信しました
          </h1>
          <p className="text-gray-600 mb-6">
            ご協力ありがとうございました。
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {survey?.title}
            </h1>
            {survey?.description && (
              <div 
                className="text-gray-600 prose prose-sm max-w-none rich-text-content"
                dangerouslySetInnerHTML={{ __html: survey.description }}
                style={{
                  // リッチテキストのスタイルを保持
                  color: 'inherit'
                }}
              />
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {pages.length > 0 && pages[currentPage] && (
              <div className="page-content">
                {pages[currentPage].questions.map((question, questionIndex) => (
                    <div key={question.id} className="space-y-2 mb-6">
                      {question.isSection ? (
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                          <h3 className="text-lg font-semibold text-blue-900">{question.title}</h3>
                        </div>
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-gray-700">
                            {question.title}
                            {question.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                
                {question.description && (
                  <p className="text-sm text-gray-500">{question.description}</p>
                )}

                {question.type === 'TEXT' && (
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                )}

                {question.type === 'TEXTAREA' && (
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                )}

                {question.type === 'NUMBER' && (
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                )}

                {question.type === 'EMAIL' && (
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                )}

                {question.type === 'PHONE' && (
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                )}

                {question.type === 'DATE' && (
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                )}

                {question.type === 'RADIO' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option: string, optionIndex: number) => (
                      <label key={optionIndex} className="flex items-center">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                          checked={answers[question.id] === option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        />
                        <span className="ml-2 text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'CHECKBOX' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option: string, optionIndex: number) => (
                      <label key={optionIndex} className="flex items-center">
                        <input
                          type="checkbox"
                          value={option}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          checked={(answers[question.id] as string[] || []).includes(option)}
                          onChange={(e) => {
                            const currentAnswers = answers[question.id] as string[] || []
                            if (e.target.checked) {
                              handleAnswerChange(question.id, [...currentAnswers, option])
                            } else {
                              handleAnswerChange(question.id, currentAnswers.filter(a => a !== option))
                            }
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'SELECT' && question.options && (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  >
                    <option value="">選択してください</option>
                    {question.options.map((option: string, optionIndex: number) => (
                      <option key={optionIndex} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}

                {question.type === 'PREFECTURE' && (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  >
                    <option value="">都道府県を選択してください</option>
                    {['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
                      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
                      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
                      '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
                      '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
                      '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
                      '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'].map((prefecture) => (
                      <option key={prefecture} value={prefecture}>
                        {prefecture}
                      </option>
                    ))}
                  </select>
                )}

                {question.type === 'AGE_GROUP' && (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  >
                    <option value="">年代を選択してください</option>
                    {['10代以下', '20代', '30代', '40代', '50代', '60代', '70代以上'].map((ageGroup) => (
                      <option key={ageGroup} value={ageGroup}>
                        {ageGroup}
                      </option>
                    ))}
                  </select>
                )}

                {question.type === 'NAME' && (
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    value={answers[question.id] as string || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder="お名前を入力してください"
                  />
                )}

                {question.type === 'RATING' && (
                  <div className="space-y-2">
                    {(question.options || ['1', '2', '3', '4', '5']).map((option: string, optionIndex: number) => (
                      <label key={optionIndex} className="flex items-center">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                          checked={answers[question.id] === option}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        />
                        <span className="ml-2 text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'LOCATION' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-2">
                        📍 位置情報の取得について
                      </p>
                      <p className="text-sm text-blue-700">
                        この質問では、あなたの現在位置を自動取得します。位置情報は個人情報のため、取得前に確認いたします。
                      </p>
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          ⚠️ localhost環境では位置情報が取得できない場合があります。本番環境（HTTPS）では正常に動作します。
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => getCurrentLocation(question.id)}
                      disabled={locationLoading[question.id]}
                      className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        locationLoading[question.id]
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {locationLoading[question.id] ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          位置情報を取得中...
                        </span>
                      ) : (
                        '📍 現在位置を取得'
                      )}
                    </button>
                    {answers[question.id] && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✅ 位置情報が取得されました
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          緯度: {answers[question.id].toString().split(',')[0]}, 経度: {answers[question.id].toString().split(',')[1]}
                        </p>
                      </div>
                    )}

                    {/* 手動入力の代替手段 */}
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-700 mb-2">
                            位置情報が取得できない場合は、手動で入力することもできます：
                          </p>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              placeholder="緯度（例: 35.6762）"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                              onChange={(e) => {
                                const lat = e.target.value
                                const lng = answers[question.id]?.toString().split(',')[1] || ''
                                if (lat && lng) {
                                  handleAnswerChange(question.id, `${lat},${lng}`)
                                }
                              }}
                            />
                            <input
                              type="text"
                              placeholder="経度（例: 139.6503）"
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                              onChange={(e) => {
                                const lng = e.target.value
                                const lat = answers[question.id]?.toString().split(',')[0] || ''
                                if (lat && lng) {
                                  handleAnswerChange(question.id, `${lat},${lng}`)
                                }
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            例: 東京駅付近 → 緯度: 35.6812, 経度: 139.7671
                          </p>
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => handleAnswerChange(question.id, '35.6812,139.7671')}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              テスト用: 東京駅の座標を設定
                            </button>
                          </div>
                    </div>
                  </div>
                )}

                {question.type === 'FILE_UPLOAD' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 mb-2">
                        📁 ファイルアップロードについて
                      </p>
                      <p className="text-sm text-yellow-700">
                        画像、PDF、Word文書などのファイルをアップロードできます。最大10MBまで対応しています。
                      </p>
                      {question.settings?.allowedFileTypes?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-yellow-800 font-medium">許可されるファイル形式:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {question.settings.allowedFileTypes.map((fileType: string) => {
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
                              const option = fileTypeOptions.find(opt => opt.value === fileType)
                              return option?.extensions.map(ext => (
                                <span key={ext} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                  {ext}
                                </span>
                              ))
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      multiple
                      accept={getAcceptString(question.settings?.allowedFileTypes)}
                      onChange={(e) => handleFileUpload(question.id, e.target.files, question.settings?.allowedFileTypes)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                    {fileUploads[question.id] && fileUploads[question.id].length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">アップロードされたファイル:</p>
                        {fileUploads[question.id].map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)}MB)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                        </>
                      )}
                    </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            {/* ページネーションUI */}
            {pages.length > 1 && (
              <div className="mt-8">
                {/* ページ進捗インジケーター */}
                <div className="flex justify-center mb-4">
                  <div className="flex space-x-2">
                    {pages.map((_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full ${
                          index === currentPage ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* ページ番号表示 */}
                <div className="text-center text-sm text-gray-600 mb-4">
                  {currentPage + 1} / {pages.length} ページ
                </div>

                {/* ナビゲーションボタン */}
                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      prevPage()
                    }}
                    disabled={isFirstPage}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    前へ
                  </button>

                  {isLastPage ? (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-primary text-primary-foreground px-8 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? '送信中...' : '回答を送信'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        nextPage()
                      }}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                    >
                      次へ
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 単一ページの場合の送信ボタン */}
            {pages.length <= 1 && (
              <div className="flex justify-center mt-8">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '送信中...' : '回答を送信'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
