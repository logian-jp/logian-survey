'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DiscountLink {
  id: string
  code: string
  name: string
  description?: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  targetTicketType: string
  originalPrice: number
  discountedPrice: number
  maxUses?: number
  currentUses: number
  isActive: boolean
  validFrom: string
  validUntil: string
  createdAt: string
  createdBy: string
  creator: {
    id: string
    name: string | null
    email: string
  } | null
  subscriptionDiscountMonths?: number | null
  totalSavings?: number | null
  users: Array<{
    id: string
    name?: string
    email: string
    userPlan: {
      planType: string
      startDate: string
    }
  }>
}

const ticketNames: Record<string, string> = {
  FREE: '無料チケット',
  STANDARD: 'スタンダードチケット',
  PROFESSIONAL: 'プロフェッショナルチケット',
  ENTERPRISE: 'エンタープライズチケット'
}

const ticketPrices: Record<string, number> = {
  FREE: 0,
  STANDARD: 2980,
  PROFESSIONAL: 10000,
  ENTERPRISE: 50000
}

export default function DiscountLinksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [discountLinks, setDiscountLinks] = useState<DiscountLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newLink, setNewLink] = useState({
    name: '',
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: 0,
    targetTicketType: 'STANDARD' as string,
    maxUses: null as number | null,
    validFrom: '',
    validUntil: '',
    subscriptionDiscountMonths: null as number | null,
    totalSavings: null as number | null
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    // 管理者権限のチェック（メールアドレスで判定）
    const adminEmails = ['admin@logian.jp', 'takashi@logian.jp', 'noutomi0729@gmail.com']
    if (!adminEmails.includes(session.user?.email || '')) {
      router.push('/dashboard')
      return
    }
    
    fetchDiscountLinks()
  }, [session, status, router])

  const fetchDiscountLinks = async () => {
    setIsLoading(true)
    try {
      console.log('Fetching discount links from API...')
      const response = await fetch('/api/admin/discount-links')
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Received discount links:', data)
        data.forEach((link: any) => {
          console.log(`Frontend received: ${link.code} - isActive: ${link.isActive}, validFrom: ${link.validFrom}, validUntil: ${link.validUntil}`)
        })
        setDiscountLinks(data)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch discount links:', response.status, errorData)
        alert(`割引リンクの取得に失敗しました: ${errorData.message || response.statusText}`)
      }
    } catch (error) {
      console.error('Error fetching discount links:', error)
      alert('割引リンクの取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  // サブスクリプション割引の計算
  const calculateSubscriptionDiscount = () => {
    if (!newLink.subscriptionDiscountMonths || newLink.targetTicketType === 'FREE') {
      return null
    }
    
    const monthlyPrice = ticketPrices[newLink.targetTicketType]
    const totalMonths = newLink.subscriptionDiscountMonths
    const originalTotal = monthlyPrice * totalMonths
    
    let discountedTotal: number
    if (newLink.discountType === 'PERCENTAGE') {
      discountedTotal = originalTotal * (1 - newLink.discountValue / 100)
    } else {
      discountedTotal = Math.max(0, originalTotal - newLink.discountValue)
    }
    
    const totalSavings = originalTotal - discountedTotal
    return { originalTotal, discountedTotal, totalSavings }
  }

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // サブスクリプション割引の計算
    const subscriptionDiscount = calculateSubscriptionDiscount()
    const linkData = {
      ...newLink,
      totalSavings: subscriptionDiscount?.totalSavings || null
    }
    
    try {
      const response = await fetch('/api/admin/discount-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(linkData),
      })

      if (response.ok) {
        setShowCreateForm(false)
        setNewLink({
          name: '',
          code: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: 0,
          targetTicketType: 'STANDARD',
          maxUses: null,
          validFrom: '',
          validUntil: '',
          subscriptionDiscountMonths: null,
          totalSavings: null
        })
        fetchDiscountLinks()
      } else {
        alert('割引リンクの作成に失敗しました')
      }
    } catch (error) {
      console.error('Failed to create discount link:', error)
      alert('エラーが発生しました')
    }
  }

  const toggleLinkStatus = async (linkId: string, currentIsActive: boolean) => {
    try {
      const newIsActive = !currentIsActive
      console.log(`Toggling discount link ${linkId} from ${currentIsActive} to ${newIsActive}`)
      
      const response = await fetch(`/api/admin/discount-links/${linkId}/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newIsActive }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Toggle response:', result)
        
        // ローカル状態を更新
        setDiscountLinks(prev => {
          const updated = prev.map(link => 
            link.id === linkId ? { ...link, isActive: newIsActive } : link
          )
          console.log('Updated discount links state:', updated.map(l => ({ code: l.code, isActive: l.isActive })))
          return updated
        })
        alert(`割引リンクを${newIsActive ? '有効化' : '無効化'}しました`)
      } else {
        const error = await response.json()
        console.error('Toggle failed:', error)
        alert(`ステータスの更新に失敗しました: ${error.message}`)
      }
    } catch (error) {
      console.error('Failed to update link status:', error)
      alert('エラーが発生しました')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isLinkValid = (link: DiscountLink) => {
    const now = new Date()
    const validFrom = new Date(link.validFrom)
    const validUntil = new Date(link.validUntil)
    return now >= validFrom && now <= validUntil && link.isActive
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
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                割引リンク管理
              </h1>
              <p className="text-gray-600">
                プランアップグレード用の割引リンクを作成・管理します
              </p>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/admin"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                管理画面に戻る
              </Link>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                新しい割引リンクを作成
              </button>
            </div>
          </div>
        </div>

        {/* 作成フォーム */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              新しい割引リンクを作成
            </h2>
            
            {/* 注意事項 */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    重要な注意事項
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>割引リンクは作成後、<strong>変更できません</strong></li>
                      <li>割引コード、割引率、対象プランは後から修正できません</li>
                      <li>使用回数制限や有効期限も変更できません</li>
                      <li>作成前にすべての設定を慎重に確認してください</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleCreateLink} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    リンク名
                  </label>
                  <input
                    type="text"
                    value={newLink.name}
                    onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    割引コード
                  </label>
                  <input
                    type="text"
                    value={newLink.code}
                    onChange={(e) => setNewLink({ ...newLink, code: e.target.value.toUpperCase() })}
                    placeholder="例: INFLUENCER_20OFF, COLLAB_50OFF"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    英数字とアンダースコアのみ使用可能。大文字に自動変換されます。
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    対象チケット
                  </label>
                  <select
                    value={newLink.targetTicketType}
                    onChange={(e) => setNewLink({ ...newLink, targetTicketType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    {Object.entries(ticketNames).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name} (¥{ticketPrices[key].toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    割引タイプ
                  </label>
                  <select
                    value={newLink.discountType}
                    onChange={(e) => setNewLink({ ...newLink, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    <option value="PERCENTAGE">パーセンテージ割引</option>
                    <option value="FIXED_AMOUNT">固定金額割引</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {newLink.discountType === 'PERCENTAGE' ? '割引率 (%)' : '割引金額 (円)'}
                  </label>
                  <input
                    type="text"
                    value={newLink.discountValue || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || /^\d+(\.\d+)?$/.test(value)) {
                        setNewLink({ ...newLink, discountValue: value === '' ? 0 : parseFloat(value) })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                    placeholder={newLink.discountType === 'PERCENTAGE' ? '例: 40' : '例: 1000'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大利用回数 (空欄で無制限)
                  </label>
                  <input
                    type="text"
                    value={newLink.maxUses || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || /^\d+$/.test(value)) {
                        setNewLink({ ...newLink, maxUses: value === '' ? null : parseInt(value) })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="例: 10 (空欄で無制限)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    有効開始日時
                  </label>
                  <input
                    type="datetime-local"
                    value={newLink.validFrom}
                    onChange={(e) => setNewLink({ ...newLink, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    有効終了日時
                  </label>
                  <input
                    type="datetime-local"
                    value={newLink.validUntil}
                    onChange={(e) => setNewLink({ ...newLink, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    サブスクリプション割引期間（月数）
                  </label>
                  <input
                    type="text"
                    value={newLink.subscriptionDiscountMonths || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || /^\d+$/.test(value)) {
                        setNewLink({ 
                          ...newLink, 
                          subscriptionDiscountMonths: value === '' ? null : parseInt(value) 
                        })
                      }
                    }}
                    placeholder="例: 12 (12ヶ月間の割引)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    サブスクリプションプランの場合のみ設定。空欄の場合は1回限りの割引。
                  </p>
                </div>
              </div>
              
              {/* 割引計算プレビュー */}
              {newLink.targetTicketType !== 'FREE' && newLink.subscriptionDiscountMonths && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">割引計算プレビュー</h4>
                  {(() => {
                    const discount = calculateSubscriptionDiscount()
                    if (!discount) return null
                    
                    return (
                      <div className="text-sm text-blue-800">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">期間:</span> {newLink.subscriptionDiscountMonths}ヶ月
                          </div>
                          <div>
                            <span className="font-medium">月額料金:</span> ¥{ticketPrices[newLink.targetTicketType].toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">通常料金合計:</span> ¥{discount.originalTotal.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">割引後合計:</span> ¥{discount.discountedTotal.toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <div className="text-lg font-bold text-green-600">
                            合計節約額: ¥{discount.totalSavings.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={newLink.description}
                  onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 割引リンク一覧 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              割引リンク一覧
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    リンク名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    コード
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    対象プラン
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    割引
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    利用状況
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    期間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                    <div className="text-xs text-gray-400 font-normal">
                      (アクティブ/利用可能)
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {discountLinks.map((link) => (
                  <tr key={link.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {link.name}
                        </div>
                        {link.description && (
                          <div className="text-sm text-gray-500">
                            {link.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {link.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticketNames[link.targetTicketType]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          ¥{link.originalPrice.toLocaleString()} → ¥{link.discountedPrice.toLocaleString()}
                        </div>
                        <div className="text-gray-500">
                          {link.discountType === 'PERCENTAGE' 
                            ? `${link.discountValue}% オフ`
                            : `¥${link.discountValue.toLocaleString()} オフ`
                          }
                        </div>
                        {link.subscriptionDiscountMonths && link.totalSavings && (
                          <div className="text-green-600 font-medium">
                            {link.subscriptionDiscountMonths}ヶ月で¥{link.totalSavings.toLocaleString()}節約
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {link.currentUses} / {link.maxUses || '∞'}
                        </div>
                        <div className="text-gray-500">
                          {link.users.length} 人が利用
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>開始: {formatDate(link.validFrom)}</div>
                        <div>終了: {formatDate(link.validUntil)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {link.creator?.name || 'N/A'}
                        </div>
                        <div className="text-gray-500">
                          {link.creator?.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          link.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {link.isActive ? 'アクティブ' : '非アクティブ'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isLinkValid(link)
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isLinkValid(link) ? '利用可能' : '利用不可'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleLinkStatus(link.id, link.isActive)}
                        className={`mr-2 ${
                          link.isActive
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {link.isActive ? '無効化' : '有効化'}
                      </button>
                      <Link
                        href={`/admin/discount-links/${link.id}`}
                        className="text-primary hover:text-primary/80"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
