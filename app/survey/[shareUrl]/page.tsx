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
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (shareUrl) {
      fetchSurvey()
    }
  }, [shareUrl])

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
              <p className="text-gray-600">{survey.description}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {survey?.questions.map((question, index) => (
              <div key={question.id} className="space-y-2">
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
                    {question.options.map((option, optionIndex) => (
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
                    {question.options.map((option, optionIndex) => (
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
                    {question.options.map((option, optionIndex) => (
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
                    {(question.options || ['1', '2', '3', '4', '5']).map((option, optionIndex) => (
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
              </div>
            ))}

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '送信中...' : '回答を送信'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
