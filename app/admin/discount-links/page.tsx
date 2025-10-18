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
  targetPlanType: string
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

const planNames: Record<string, string> = {
  FREE: '基本プラン',
  ONETIME_UNLIMITED: '単発無制限プラン',
  STANDARD: 'スタンダードプラン',
  PROFESSIONAL: 'プロフェッショナルプラン',
  ENTERPRISE: 'エンタープライズプラン'
}

const planPrices: Record<string, number> = {
  FREE: 0,
  ONETIME_UNLIMITED: 10000,
  STANDARD: 2980,
  PROFESSIONAL: 9800,
  ENTERPRISE: 29800
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
    targetPlanType: 'STANDARD' as string,
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
    if (!newLink.subscriptionDiscountMonths || newLink.targetPlanType === 'FREE' || newLink.targetPlanType === 'ONETIME_UNLIMITED') {
      return null
    }
    
    const monthlyPrice = planPrices[newLink.targetPlanType]
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
          targetPlanType: 'STANDARD',
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

  const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/discount-links/${linkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (response.ok) {
        fetchDiscountLinks()
      } else {
        alert('ステータスの更新に失敗しました')
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
                    対象プラン
                  </label>
                  <select
                    value={newLink.targetPlanType}
                    onChange={(e) => setNewLink({ ...newLink, targetPlanType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  >
                    {Object.entries(planNames).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name} (¥{planPrices[key].toLocaleString()})
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
              {newLink.targetPlanType !== 'FREE' && newLink.targetPlanType !== 'ONETIME_UNLIMITED' && newLink.subscriptionDiscountMonths && (
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
                            <span className="font-medium">月額料金:</span> ¥{planPrices[newLink.targetPlanType].toLocaleString()}
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
                      {planNames[link.targetPlanType]}
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isLinkValid(link)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isLinkValid(link) ? '有効' : '無効'}
                      </span>
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
