'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TicketPurchase {
  id: string
  ticketType: string
  amount: number
  currency: string
  checkoutSessionId: string
  metadata: any
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    createdAt: string
  }
  survey: {
    id: string
    title: string
    shareUrl: string
    createdAt: string
  } | null
}

interface TicketPurchaseStats {
  totalPurchases: number
  totalAmount: number
  averageAmount: number
}

interface TicketPurchaseFilters {
  userId: string
  ticketType: string
  startDate: string
  endDate: string
  minAmount: string
  maxAmount: string
  search: string
  page: number
  limit: number
}

export default function AdminPurchasesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [ticketPurchases, setTicketPurchases] = useState<TicketPurchase[]>([])
  const [ticketPurchaseStats, setTicketPurchaseStats] = useState<TicketPurchaseStats | null>(null)
  const [ticketPurchaseFilters, setTicketPurchaseFilters] = useState<TicketPurchaseFilters>({
    userId: '',
    ticketType: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    search: '',
    page: 1,
    limit: 50
  })
  const [users, setUsers] = useState<Array<{id: string, name: string | null, email: string}>>([])
  const [isLoadingTicketPurchases, setIsLoadingTicketPurchases] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

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
    
    fetchTicketPurchases()
  }, [session, status, ticketPurchaseFilters])

  const fetchTicketPurchases = async () => {
    setIsLoadingTicketPurchases(true)
    try {
      const params = new URLSearchParams()
      Object.entries(ticketPurchaseFilters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString())
      })

      const response = await fetch(`/api/admin/ticket-purchases?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTicketPurchases(data.purchases)
        setTicketPurchaseStats(data.stats)
        setUsers(data.users)
        setPagination(data.pagination)
      } else {
        console.error('Failed to fetch ticket purchases:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch ticket purchases:', error)
    } finally {
      setIsLoadingTicketPurchases(false)
    }
  }

  const handleFilterChange = (key: keyof TicketPurchaseFilters, value: string | number) => {
    setTicketPurchaseFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  const handlePageChange = (newPage: number) => {
    setTicketPurchaseFilters(prev => ({
      ...prev,
      page: newPage
    }))
  }

  const clearFilters = () => {
    setTicketPurchaseFilters({
      userId: '',
      ticketType: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      search: '',
      page: 1,
      limit: 50
    })
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">チケット購入履歴</h1>
              <p className="text-gray-600 mt-1">全ユーザーのチケット購入履歴を管理できます</p>
            </div>
            <Link
              href="/admin"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              管理画面に戻る
            </Link>
          </div>
        </div>

        {/* フィルター */}
        <div className="mb-8 bg-white shadow-sm rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">フィルター</h2>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                フィルターをクリア
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー</label>
                <select
                  value={ticketPurchaseFilters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべてのユーザー</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">チケットタイプ</label>
                <select
                  value={ticketPurchaseFilters.ticketType}
                  onChange={(e) => handleFilterChange('ticketType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  <option value="FREE">無料</option>
                  <option value="STANDARD">スタンダード</option>
                  <option value="PROFESSIONAL">プロフェッショナル</option>
                  <option value="ENTERPRISE">エンタープライズ</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                <input
                  type="date"
                  value={ticketPurchaseFilters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                <input
                  type="date"
                  value={ticketPurchaseFilters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最小金額</label>
                <input
                  type="number"
                  value={ticketPurchaseFilters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大金額</label>
                <input
                  type="number"
                  value={ticketPurchaseFilters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  placeholder="10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">検索</label>
                <input
                  type="text"
                  value={ticketPurchaseFilters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="ユーザー名、メール、決済ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 統計情報 */}
          {ticketPurchaseStats && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-4">統計情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {ticketPurchaseStats.totalPurchases}
                  </div>
                  <div className="text-sm text-gray-500">総購入数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ¥{ticketPurchaseStats.totalAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">総売上</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ¥{Math.round(ticketPurchaseStats.averageAmount).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">平均単価</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 購入履歴テーブル */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">購入履歴一覧</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">購入日時</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">チケットタイプ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">決済ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">接続アンケート</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">詳細</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoadingTicketPurchases ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : ticketPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      購入履歴がありません
                    </td>
                  </tr>
                ) : (
                  ticketPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(purchase.createdAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{purchase.user.name || '未設定'}</div>
                          <div className="text-gray-500">{purchase.user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          purchase.ticketType === 'FREE' ? 'bg-gray-100 text-gray-800' :
                          purchase.ticketType === 'STANDARD' ? 'bg-blue-100 text-blue-800' :
                          purchase.ticketType === 'PROFESSIONAL' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {purchase.ticketType === 'FREE' && '無料'}
                          {purchase.ticketType === 'STANDARD' && 'スタンダード'}
                          {purchase.ticketType === 'PROFESSIONAL' && 'プロフェッショナル'}
                          {purchase.ticketType === 'ENTERPRISE' && 'エンタープライズ'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {purchase.amount === 0 ? (
                          <span className="text-green-600 font-medium">招待リワード</span>
                        ) : (
                          `¥${purchase.amount.toLocaleString()}`
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {purchase.checkoutSessionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {purchase.survey ? (
                          <div>
                            <div className="font-medium text-blue-600">{purchase.survey.title}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(purchase.survey.createdAt).toLocaleDateString('ja-JP')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">未接続</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {purchase.survey && (
                          <div className="flex space-x-2">
                            <Link
                              href={`/surveys/${purchase.survey.id}/edit`}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              編集
                            </Link>
                            <Link
                              href={`/surveys/${purchase.survey.id}/responses`}
                              className="text-green-600 hover:text-green-800 text-xs"
                            >
                              回答
                            </Link>
                            <a
                              href={`/survey/${purchase.survey.shareUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 text-xs"
                            >
                              公開URL
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {pagination.total} 件中 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 件を表示
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    前へ
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    次へ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}