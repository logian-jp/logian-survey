'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
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

export default function DiscountLinkDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const linkId = params.id as string

  const [discountLink, setDiscountLink] = useState<DiscountLink | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    
    fetchDiscountLink()
  }, [session, status, router, linkId])

  const fetchDiscountLink = async () => {
    setIsLoading(true)
    try {
      console.log('Fetching discount link with ID:', linkId)
      const response = await fetch(`/api/admin/discount-links/${linkId}`)
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Received discount link:', data)
        setDiscountLink(data)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch discount link:', response.status, errorData)
        alert(`割引リンクの取得に失敗しました: ${errorData.message || response.statusText}`)
        router.push('/admin/discount-links')
      }
    } catch (error) {
      console.error('Error fetching discount link:', error)
      alert('割引リンクの取得中にエラーが発生しました')
      router.push('/admin/discount-links')
    } finally {
      setIsLoading(false)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">割引リンクの詳細を読み込み中...</div>
        </div>
      </div>
    )
  }

  if (!discountLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-xl font-semibold text-gray-900 mb-2">割引リンクが見つかりません</div>
          <div className="text-gray-600 mb-4">指定された割引リンクが存在しないか、アクセス権限がありません。</div>
          <Link
            href="/admin/discount-links"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            ← 割引リンク一覧に戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/admin/discount-links"
              className="text-primary hover:text-primary/80"
            >
              ← 割引リンク一覧に戻る
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {discountLink.name}
          </h1>
          <p className="text-gray-600">
            割引リンクの詳細情報と利用者一覧
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 基本情報 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                基本情報
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    リンク名
                  </label>
                  <p className="text-sm text-gray-900">{discountLink.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    コード
                  </label>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {discountLink.code}
                  </code>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    対象プラン
                  </label>
                  <p className="text-sm text-gray-900">
                    {planNames[discountLink.targetPlanType]}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    割引タイプ
                  </label>
                  <p className="text-sm text-gray-900">
                    {discountLink.discountType === 'PERCENTAGE' 
                      ? 'パーセンテージ割引' 
                      : '固定金額割引'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    割引値
                  </label>
                  <p className="text-sm text-gray-900">
                    {discountLink.discountType === 'PERCENTAGE' 
                      ? `${discountLink.discountValue}%`
                      : `¥${discountLink.discountValue.toLocaleString()}`
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    価格
                  </label>
                  <p className="text-sm text-gray-900">
                    ¥{discountLink.originalPrice.toLocaleString()} → ¥{discountLink.discountedPrice.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    利用状況
                  </label>
                  <p className="text-sm text-gray-900">
                    {discountLink.currentUses} / {discountLink.maxUses || '∞'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    作成者
                  </label>
                  <p className="text-sm text-gray-900">
                    {discountLink.creator?.name || 'N/A'} ({discountLink.creator?.email || 'N/A'})
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ステータス
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isLinkValid(discountLink)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isLinkValid(discountLink) ? '有効' : '無効'}
                  </span>
                </div>
              </div>
              {discountLink.description && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <p className="text-sm text-gray-900">{discountLink.description}</p>
                </div>
              )}
            </div>

            {/* 利用者一覧 */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  利用者一覧 ({discountLink.users.length}人)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ユーザー
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        現在のプラン
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        プラン開始日
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {discountLink.users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || '名前未設定'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {planNames[user.userPlan.planType]}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(user.userPlan.startDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {discountLink.users.length === 0 && (
                  <div className="px-6 py-8 text-center text-gray-500">
                    まだ利用者がいません
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 期間情報 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                期間情報
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    有効開始日時
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(discountLink.validFrom)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    有効終了日時
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(discountLink.validUntil)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    作成日時
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatDate(discountLink.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                統計情報
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">利用者数</span>
                  <span className="text-sm font-medium text-gray-900">
                    {discountLink.users.length}人
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">利用回数</span>
                  <span className="text-sm font-medium text-gray-900">
                    {discountLink.currentUses}回
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">残り利用可能</span>
                  <span className="text-sm font-medium text-gray-900">
                    {discountLink.maxUses ? discountLink.maxUses - discountLink.currentUses : '∞'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">総割引額</span>
                  <span className="text-sm font-medium text-gray-900">
                    ¥{((discountLink.originalPrice - discountLink.discountedPrice) * discountLink.currentUses).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* アクション */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                アクション
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/plans/upgrade?plan=${discountLink.targetPlanType}&discountCode=${discountLink.code}`
                    navigator.clipboard.writeText(url)
                    alert('割引リンクをクリップボードにコピーしました')
                  }}
                  className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  割引リンクをコピー
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/plans/upgrade?plan=${discountLink.targetPlanType}&discountCode=${discountLink.code}`
                    window.open(url, '_blank')
                  }}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  割引リンクを開く
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
