'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Survey {
  id: string
  title: string
  description: string | null
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  createdAt: string
  responseCount: number
  owner: {
    id: string
    name: string | null
    email: string
  }
  userPermission: 'OWNER' | 'ADMIN' | 'EDIT' | 'VIEW'
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchSurveys()
    }
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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
            <Link
              href="/surveys/create"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              新しいアンケートを作成
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {survey.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    survey.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800'
                      : survey.status === 'DRAFT'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {survey.status === 'ACTIVE' ? '公開中' : 
                     survey.status === 'DRAFT' ? '下書き' : '終了'}
                  </span>
                </div>
                
                {survey.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {survey.description}
                  </p>
                )}
                
                <div className="text-sm text-gray-500 mb-4">
                  <p>回答数: {survey.responseCount}件</p>
                  <p>作成日: {new Date(survey.createdAt).toLocaleDateString('ja-JP')}</p>
                  <p>所有者: {survey.owner.name || survey.owner.email}</p>
                  <p>あなたの権限: {
                    survey.userPermission === 'OWNER' ? '所有者' :
                    survey.userPermission === 'ADMIN' ? '管理者' :
                    survey.userPermission === 'EDIT' ? '編集' : '閲覧'
                  }</p>
                </div>
                
                <div className="flex space-x-2">
                  {(survey.userPermission === 'OWNER' || survey.userPermission === 'ADMIN' || survey.userPermission === 'EDIT') && (
                    <Link
                      href={`/surveys/${survey.id}/edit`}
                      className="flex-1 text-center py-2 px-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      編集
                    </Link>
                  )}
                  <Link
                    href={`/surveys/${survey.id}/responses`}
                    className={`text-center py-2 px-3 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors ${
                      (survey.userPermission === 'OWNER' || survey.userPermission === 'ADMIN' || survey.userPermission === 'EDIT') 
                        ? 'flex-1' : 'w-full'
                    }`}
                  >
                    回答を見る
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
