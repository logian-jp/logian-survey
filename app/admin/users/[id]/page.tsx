'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string | null
  email: string
  createdAt: string
  updatedAt: string
  role: string
  maxInvitations: number
  usedInvitations: number
  _count: {
    surveys: number
    invitations: number
    ticketPurchases: number
  }
  surveys: Array<{
    id: string
    title: string
    status: string
    createdAt: string
    _count: {
      responses: number
    }
  }>
  ticketPurchases: Array<{
    id: string
    ticketType: string
    amount: number
    currency: string
    createdAt: string
    metadata: any
  }>
  invitations: Array<{
    id: string
    code: string
    invitedEmail: string | null
    isUsed: boolean
    createdAt: string
    usedAt: string | null
  }>
}

export default function UserDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    
    fetchUser()
  }, [session, status, params.id])

  const fetchUser = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        console.error('Failed to fetch user:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch user:', error)
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

  if (session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">管理者権限が必要です</div>
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">ユーザーが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ユーザー詳細</h1>
              <p className="text-gray-600 mt-1">{user.name || user.email} の詳細情報</p>
            </div>
            <Link
              href="/admin/users"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              ユーザー一覧に戻る
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 基本情報 */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">名前</dt>
                  <dd className="text-sm text-gray-900">{user.name || '未設定'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                  <dd className="text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">ロール</dt>
                  <dd className="text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'ADMIN' ? '管理者' : '一般ユーザー'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">登録日時</dt>
                  <dd className="text-sm text-gray-900">{new Date(user.createdAt).toLocaleString('ja-JP')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">最終更新</dt>
                  <dd className="text-sm text-gray-900">{new Date(user.updatedAt).toLocaleString('ja-JP')}</dd>
                </div>
              </dl>
            </div>

            {/* 招待情報 */}
            <div className="bg-white shadow-sm rounded-lg p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">招待情報</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">招待枠</dt>
                  <dd className="text-sm text-gray-900">{user.usedInvitations} / {user.maxInvitations}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">招待作成数</dt>
                  <dd className="text-sm text-gray-900">{user._count?.invitations || 0}件</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 統計情報とアクティビティ */}
          <div className="lg:col-span-2">
            {/* 統計情報 */}
            <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">統計情報</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{user._count?.surveys || 0}</div>
                  <div className="text-sm text-gray-500">アンケート数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{user._count?.invitations || 0}</div>
                  <div className="text-sm text-gray-500">招待作成数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{user._count?.ticketPurchases || 0}</div>
                  <div className="text-sm text-gray-500">チケット購入数</div>
                </div>
              </div>
            </div>

            {/* 最近のアンケート */}
            <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">最近のアンケート</h2>
              {(user.surveys || []).length === 0 ? (
                <p className="text-gray-500">アンケートがありません</p>
              ) : (
                <div className="space-y-3">
                  {(user.surveys || []).slice(0, 5).map((survey) => (
                    <div key={survey.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{survey.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(survey.createdAt).toLocaleString('ja-JP')} • {survey._count?.responses || 0}件の回答
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          survey.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          survey.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {survey.status === 'ACTIVE' ? '公開中' :
                           survey.status === 'DRAFT' ? '下書き' : '終了'}
                        </span>
                        <Link
                          href={`/surveys/${survey.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          編集
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 最近のチケット購入 */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">最近のチケット購入</h2>
              {user.ticketPurchases.length === 0 ? (
                <p className="text-gray-500">チケット購入履歴がありません</p>
              ) : (
                <div className="space-y-3">
                  {user.ticketPurchases.slice(0, 5).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">
                          {purchase.ticketType === 'STANDARD' ? 'スタンダードチケット' : 
                           purchase.ticketType === 'PREMIUM' ? 'プレミアムチケット' : 
                           purchase.ticketType}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(purchase.createdAt).toLocaleString('ja-JP')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {purchase.amount === 0 ? (
                            <span className="text-green-600">招待リワード</span>
                          ) : (
                            `¥${purchase.amount.toLocaleString()}`
                          )}
                        </div>
                        {purchase.metadata?.type === 'invitation_reward' && (
                          <div className="text-xs text-green-600">
                            招待リワード
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
