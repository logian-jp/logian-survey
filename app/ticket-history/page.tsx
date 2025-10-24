'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface TicketPurchase {
  id: string
  ticketType: string
  amount: number
  currency: string
  createdAt: string
  survey?: {
    id: string
    title: string
    shareUrl: string
  }
}

export default function TicketHistoryPage() {
  const { data: session } = useSession()
  const [purchases, setPurchases] = useState<TicketPurchase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchTicketPurchases()
    }
  }, [session])

  const fetchTicketPurchases = async () => {
    try {
      const response = await fetch('/api/user/ticket-purchases')
      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases || [])
      }
    } catch (error) {
      console.error('Failed to fetch ticket purchases:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTicketTypeName = (ticketType: string) => {
    switch (ticketType) {
      case 'STANDARD':
        return 'スタンダードチケット'
      case 'PROFESSIONAL':
        return 'プロフェッショナルチケット'
      case 'ENTERPRISE':
        return 'エンタープライズチケット'
      default:
        return ticketType
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-4">ログインが必要です</div>
          <Link 
            href="/auth/signin" 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            ログインページへ
          </Link>
        </div>
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">チケット購入履歴</h1>
              <p className="text-gray-600 mt-2">過去のチケット購入履歴と関連するアンケートを確認できます</p>
            </div>
            <Link
              href="/settings"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← 設定に戻る
            </Link>
          </div>
        </div>

        {purchases.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">購入履歴がありません</h3>
            <p className="text-gray-600 mb-6">まだチケットを購入していません。</p>
            <Link
              href="/tickets"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              チケットを購入する
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="bg-white rounded-lg shadow-sm border">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getTicketTypeName(purchase.ticketType)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        購入日: {new Date(purchase.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        ¥{purchase.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {purchase.currency.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* 関連するアンケート */}
                  {purchase.survey ? (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">関連するアンケート</h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-900">
                              {purchase.survey.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              アンケートID: {purchase.survey.id}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Link
                              href={`/surveys/${purchase.survey.id}/edit`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              編集
                            </Link>
                            <Link
                              href={`/surveys/${purchase.survey.id}/responses`}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              回答一覧
                            </Link>
                            {purchase.survey.shareUrl && (
                              <Link
                                href={`/survey/${purchase.survey.shareUrl}`}
                                target="_blank"
                                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                              >
                                公開URL
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-4">
                      <div className="text-sm text-gray-500">
                        このチケットはまだ使用されていません
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 統計情報 */}
        {purchases.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">購入統計</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {purchases.length}
                </div>
                <div className="text-sm text-gray-500">総購入回数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ¥{purchases.reduce((sum, purchase) => sum + purchase.amount, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">総購入金額</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {purchases.filter(p => p.survey).length}
                </div>
                <div className="text-sm text-gray-500">使用済みチケット</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
