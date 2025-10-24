'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface SurveyPurchase {
  id: string
  userId: string
  surveyId: string | null
  planType: string
  amount: number | null
  currency: string | null
  status: string
  purchasedAt: string
  user: {
    name: string | null
    email: string
  }
  survey: {
    id: string
    title: string
  } | null
}

export default function AdminPurchasesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [purchases, setPurchases] = useState<SurveyPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchPurchases()
  }, [session, status, router])

  const fetchPurchases = async () => {
    try {
      const response = await fetch('/api/admin/purchases')
      if (!response.ok) {
        throw new Error('購入履歴の取得に失敗しました')
      }
      const data = await response.json()
      setPurchases(data.purchases || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return '無料'
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency || 'JPY'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      ACTIVE: { text: '有効', className: 'bg-green-100 text-green-800' },
      CANCELLED: { text: 'キャンセル', className: 'bg-gray-100 text-gray-800' },
      REFUNDED: { text: '返金済み', className: 'bg-red-100 text-red-800' }
    }
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, className: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    )
  }

  const getPlanTypeName = (planType: string) => {
    const planNames = {
      FREE: '無料プラン',
      STANDARD: 'スタンダードプラン',
      PROFESSIONAL: 'プロフェッショナルプラン',
      ENTERPRISE: 'エンタープライズプラン',
      ONETIME_UNLIMITED: '無制限プラン'
    }
    return planNames[planType as keyof typeof planNames] || planType
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchPurchases}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">購入履歴一覧</h1>
            <p className="mt-1 text-sm text-gray-500">
              全ユーザーのプラン購入履歴を管理できます
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    購入ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アンケート
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    プラン
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    購入日時
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      購入履歴がありません
                    </td>
                  </tr>
                ) : (
                  purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {purchase.id.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {purchase.user.name || '名前なし'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {purchase.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {purchase.survey ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {purchase.survey.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {purchase.survey.id.slice(-8)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">未指定</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getPlanTypeName(purchase.planType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(purchase.amount, purchase.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(purchase.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(purchase.purchasedAt).toLocaleString('ja-JP')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {purchases.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  合計 {purchases.length} 件の購入履歴
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={fetchPurchases}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    更新
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

