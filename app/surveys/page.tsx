'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Survey {
  id: string
  title: string
  description: string | null
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  shareUrl: string | null
  createdAt: string
  responseCount: number
  owner: {
    id: string
    name: string | null
    email: string
  }
  userPermission: 'OWNER' | 'ADMIN' | 'EDIT' | 'VIEW'
}

export default function SurveysPage() {
  const { data: session } = useSession()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [baseUrl, setBaseUrl] = useState('')

  useEffect(() => {
    if (session) {
      fetchSurveys()
    }
    setBaseUrl(window.location.origin)
  }, [session])

  const fetchSurveys = async () => {
    try {
      const response = await fetch('/api/surveys')
      if (response.ok) {
        const data = await response.json()
        setSurveys(data)
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'CLOSED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPermissionBadge = (permission: string) => {
    switch (permission) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800'
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'EDIT':
        return 'bg-blue-100 text-blue-800'
      case 'VIEW':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPermissionText = (permission: string) => {
    switch (permission) {
      case 'OWNER':
        return '所有者'
      case 'ADMIN':
        return '管理者'
      case 'EDIT':
        return '編集'
      case 'VIEW':
        return '閲覧'
      default:
        return '閲覧'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '公開中'
      case 'DRAFT':
        return '下書き'
      case 'CLOSED':
        return '終了'
      default:
        return '不明'
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">アンケート一覧</h1>
          <Link
            href="/surveys/create"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            新しいアンケートを作成
          </Link>
        </div>
        {surveys.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだアンケートがありません
            </h3>
            <p className="text-gray-600 mb-6">
              最初のアンケートを作成して、分析に最適化されたデータを収集しましょう。
            </p>
            <Link
              href="/surveys/create"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
            >
              アンケートを作成
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">
                    アンケート名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    所有者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    あなたの権限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    公開URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    回答数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap z-10">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {survey.title}
                          </div>
                          {survey.description && (
                            <div className="text-sm text-gray-500">
                              {survey.description.length > 50 
                                ? `${survey.description.substring(0, 50)}...` 
                                : survey.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {survey.owner.name || survey.owner.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPermissionBadge(survey.userPermission)}`}>
                        {getPermissionText(survey.userPermission)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(survey.status)}`}>
                        {getStatusText(survey.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {survey.status === 'ACTIVE' && survey.shareUrl ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={`${baseUrl}/survey/${survey.shareUrl}`}
                            readOnly
                            className="px-2 py-1 text-xs border border-gray-300 rounded bg-gray-50 text-gray-600 w-48"
                            onClick={(e) => {
                              (e.target as HTMLInputElement).select()
                            }}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${baseUrl}/survey/${survey.shareUrl}`)
                              alert('URLをコピーしました')
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            コピー
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">未公開</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {survey.responseCount}件
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(survey.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {(survey.userPermission === 'OWNER' || survey.userPermission === 'ADMIN' || survey.userPermission === 'EDIT') && (
                        <Link
                          href={`/surveys/${survey.id}/edit`}
                          className="text-primary hover:text-primary/80"
                        >
                          編集
                        </Link>
                      )}
                      <Link
                        href={`/surveys/${survey.id}/responses`}
                        className="text-green-600 hover:text-green-800"
                      >
                        回答を見る
                      </Link>
                      {(survey.userPermission === 'OWNER' || survey.userPermission === 'ADMIN') && (
                        <button
                          onClick={() => {
                            const url = `/api/surveys/${survey.id}/export?format=raw`
                            window.open(url, '_blank')
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          CSV出力
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* 統計情報 */}
        {surveys.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        総アンケート数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {surveys.length}
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
                      <span className="text-white text-sm font-medium">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        公開中
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {surveys.filter(s => s.status === 'ACTIVE').length}
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
                      <span className="text-white text-sm font-medium">💬</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        総回答数
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {surveys.reduce((sum, survey) => sum + survey.responseCount, 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
