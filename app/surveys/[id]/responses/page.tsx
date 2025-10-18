'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Question {
  id: string
  type: string
  title: string
  description?: string
  required: boolean
  options?: string[]
  settings?: any
  order: number
}

interface Answer {
  id: string
  questionId: string
  value: string | null
  createdAt: string
}

interface Response {
  id: string
  createdAt: string
  answers: Answer[]
}

interface Survey {
  id: string
  title: string
  description?: string
  questions: Question[]
  responses: Response[]
}

interface CSVPreviewTableProps {
  csvData: string
}

function formatToTokyoTime(dateString: string): string {
  const date = new Date(dateString)
  const tokyoTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return tokyoTime.toISOString().replace('T', ' ').slice(0, 16)
}

function stripHtmlTags(html: string): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

function CSVPreviewTable({ csvData }: CSVPreviewTableProps) {
  if (!csvData) {
    return <div className="text-gray-500 text-center py-4">プレビューを生成中...</div>
  }

  const lines = csvData.split('\n').filter(line => line.trim())
  if (lines.length === 0) {
    return <div className="text-gray-500 text-center py-4">データがありません</div>
  }

  // CSVの解析を改善（引用符で囲まれた値も正しく処理）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // エスケープされた引用符
          current += '"'
          i++ // 次の文字をスキップ
        } else {
          // 引用符の開始/終了
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // カンマで区切り
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current)
    return result
  }

  const headers = parseCSVLine(lines[0])
  const dataRows = lines.slice(1).map(line => parseCSVLine(line))

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {dataRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {dataRows.length >= 5 && (
            <tr className="bg-gray-50">
              <td colSpan={headers.length} className="px-4 py-3 text-center text-sm text-gray-500">
                <div className="flex items-center justify-center">
                  <span className="mr-2">〜〜〜</span>
                  <span>まだ続きがあります</span>
                  <span className="ml-2">〜〜〜</span>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function SurveyResponsesPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const surveyId = params.id as string
  
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedFormat, setSelectedFormat] = useState<'raw' | 'normalized' | 'standardized'>('raw')
  const [includePersonalData, setIncludePersonalData] = useState(false)
  const [csvPreview, setCsvPreview] = useState<string>('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  useEffect(() => {
    if (session && surveyId) {
      fetchSurveyResponses()
    }
  }, [session, surveyId])

  useEffect(() => {
    if (survey) {
      fetchCSVPreview()
    }
  }, [survey, selectedFormat, includePersonalData])

  const fetchSurveyResponses = async () => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses`)
      if (response.ok) {
        const data = await response.json()
        setSurvey(data)
      } else {
        setError('アンケートが見つかりません')
      }
    } catch (error) {
      setError('データの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCSVPreview = async () => {
    if (!survey) return
    
    setIsLoadingPreview(true)
    try {
      const params = new URLSearchParams({
        format: selectedFormat,
        includePersonalData: includePersonalData.toString(),
      })
      
      const response = await fetch(`/api/surveys/${surveyId}/export/preview?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setCsvPreview(data.preview)
      } else {
        console.error('Failed to fetch CSV preview')
      }
    } catch (error) {
      console.error('CSV preview error:', error)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const downloadCSV = async () => {
    try {
      const params = new URLSearchParams({
        format: selectedFormat,
        includePersonalData: includePersonalData.toString(),
      })
      
      const url = `/api/surveys/${surveyId}/export?${params}`
      const response = await fetch(url)
      
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `${survey?.title}_${selectedFormat}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        alert('CSVのダウンロードに失敗しました')
      }
    } catch (error) {
      console.error('CSV download error:', error)
      alert('CSVのダウンロードに失敗しました')
    }
  }

  const getAnswerValue = (response: Response, questionId: string) => {
    const answer = response.answers.find(a => a.questionId === questionId)
    return answer?.value || '-'
  }

  const formatAnswerValue = (value: string, question: Question) => {
    if (!value || value === '-') return '-'
    
    if (question.type === 'CHECKBOX') {
      // 複数選択の場合はカンマ区切りで表示
      return value.split(',').join(', ')
    }
    
    return value
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">ログインが必要です</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => router.push('/surveys')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            アンケート一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
              {survey.description && (
                <p className="mt-1 text-sm text-gray-600">{stripHtmlTags(survey.description)}</p>
              )}
            </div>
            <Link
              href="/surveys"
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計情報 */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📊</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      質問数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {survey.questions.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">💬</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      回答数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {survey.responses.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📈</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      回収率
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {survey.responses.length > 0 ? '100%' : '0%'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CSV出力設定 */}
        <div className="mb-8 bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">CSV出力設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                出力形式
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="raw">通常データ</option>
                <option value="normalized">正規化データ</option>
                <option value="standardized">標準化データ</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includePersonalData"
                checked={includePersonalData}
                onChange={(e) => setIncludePersonalData(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="includePersonalData" className="ml-2 block text-sm text-gray-700">
                個人情報を含める
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={downloadCSV}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                CSVダウンロード
              </button>
            </div>
          </div>
        </div>

        {/* CSVプレビュー */}
        {survey.responses.length > 0 && (
          <div className="mb-8 bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">CSVプレビュー</h2>
              <p className="text-sm text-gray-600 mt-1">
                設定に基づくCSVの先頭5行を表示しています
              </p>
            </div>
            <div className="p-6">
              {isLoadingPreview ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-500">プレビューを生成中...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <CSVPreviewTable csvData={csvPreview} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 回答テーブル */}
        {survey.responses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだ回答がありません
            </h3>
            <p className="text-gray-600">
              アンケートを公開して回答を収集しましょう。
            </p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">回答一覧</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      回答ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      回答日時
                    </th>
                    {survey.questions.map((question) => (
                      <th key={question.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {question.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {survey.responses.map((response) => (
                    <tr key={response.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {response.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatToTokyoTime(response.createdAt)}
                      </td>
                      {survey.questions.map((question) => (
                        <td key={question.id} className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={formatAnswerValue(getAnswerValue(response, question.id), question)}>
                            {formatAnswerValue(getAnswerValue(response, question.id), question)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ページネーション（必要に応じて） */}
        {survey.responses.length > 50 && (
          <div className="mt-8 flex justify-center">
            <div className="text-sm text-gray-500">
              表示中: 1-{survey.responses.length} / {survey.responses.length}件
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
