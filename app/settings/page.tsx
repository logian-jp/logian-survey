'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import StripePortal from '@/components/StripePortal'

interface UserPlan {
  id: string
  planType: string
  maxSurveys: number
  maxResponses: number
  canUseVideoEmbedding: boolean
  canUseLocationTracking: boolean
}

interface UserProfile {
  id: string
  name: string | null
  email: string
  emailVerified: string | null
  image: string | null
  createdAt: string
}

export default function Settings() {
  const { data: session } = useSession()
  const router = useRouter()
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [planSlots, setPlanSlots] = useState<any[]>([])
  const [ticketPurchases, setTicketPurchases] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [customLogo, setCustomLogo] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [hasEnterpriseTicket, setHasEnterpriseTicket] = useState(false)

  useEffect(() => {
    if (session) {
      fetchUserPlan()
      fetchCustomLogo()
      fetchUserProfile()
      fetchPlanSlots()
      fetchTicketPurchases()
    }
  }, [session])

  const fetchUserPlan = async () => {
    // チケットシステムに移行したため、プラン情報は不要
    setUserPlan({ 
      id: 'free',
      planType: 'FREE',
      maxSurveys: 3,
      maxResponses: 100,
      canUseVideoEmbedding: false,
      canUseLocationTracking: false
    })
    setIsLoading(false)
  }

  const fetchCustomLogo = async () => {
    try {
      const response = await fetch('/api/user/custom-logo')
      if (response.ok) {
        const data = await response.json()
        setCustomLogo(data.logoUrl)
      }
    } catch (error) {
      console.error('Failed to fetch custom logo:', error)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    }
  }

  const fetchPlanSlots = async () => {
    try {
      const response = await fetch('/api/user/tickets')
      if (response.ok) {
        const data = await response.json()
        setPlanSlots(data.tickets || [])
        
        // エンタープライズチケットの有無をチェック
        const hasEnterprise = data.tickets?.some((ticket: any) => 
          ticket.ticketType === 'ENTERPRISE' && ticket.remainingTickets > 0
        ) || false
        setHasEnterpriseTicket(hasEnterprise)
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    }
  }

  const fetchTicketPurchases = async () => {
    try {
      console.log('Fetching ticket purchases...')
      const response = await fetch('/api/user/ticket-purchases')
      if (response.ok) {
        const data = await response.json()
        console.log('Ticket purchases data:', data)
        setTicketPurchases(data.purchases || [])
      } else {
        console.error('Failed to fetch ticket purchases:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch ticket purchases:', error)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user/upload-logo', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setCustomLogo(data.logoUrl)
        alert('ロゴがアップロードされました')
      } else {
        alert('ロゴのアップロードに失敗しました')
      }
    } catch (error) {
      console.error('Logo upload error:', error)
      alert('ロゴのアップロードに失敗しました')
    }
  }

  const removeCustomLogo = async () => {
    try {
      const response = await fetch('/api/user/remove-logo', {
        method: 'POST',
      })

      if (response.ok) {
        setCustomLogo(null)
        alert('ロゴが削除されました')
      } else {
        alert('ロゴの削除に失敗しました')
      }
    } catch (error) {
      console.error('Remove logo error:', error)
      alert('ロゴの削除に失敗しました')
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData(e.currentTarget)
      const name = formData.get('name') as string

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        setSuccess('プロフィールが更新されました')
        fetchUserProfile()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'プロフィールの更新に失敗しました')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      setError('プロフィールの更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('アカウントが削除されました')
        router.push('/')
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'アカウントの削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete account error:', error)
      setError('アカウントの削除に失敗しました')
    } finally {
      setIsSaving(false)
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

          {/* ユーザー情報 */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">ユーザー情報</h2>
            
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  氏名
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={userProfile?.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="氏名を入力してください"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                  {userProfile?.email || session?.user?.email || '読み込み中...'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  メールアドレスは変更できません
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メール認証状況
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                  {userProfile?.emailVerified ? (
                    <span className="text-green-600">✓ 認証済み</span>
                  ) : (
                    <span className="text-red-600">✗ 未認証</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  アカウント作成日
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                  {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('ja-JP') : '読み込み中...'}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? '更新中...' : 'プロフィールを更新'}
                </button>
              </div>
            </form>
          </div>

          {/* チケット数表示 */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">チケット数</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 無料チケットを常に表示 */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    無料チケット
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    3
                  </div>
                  <div className="text-xs text-gray-500">
                    残りチケット数 / 3枚
                  </div>
                </div>
                
                {/* 有料チケット */}
                {planSlots.filter(slot => slot.ticketType !== 'FREE').map((slot) => (
                  <div key={slot.ticketType} className="bg-white rounded-lg p-4 border">
                    <div className="text-sm font-medium text-gray-600 mb-2">
                      {slot.ticketType === 'STANDARD' && 'スタンダードチケット'}
                      {slot.ticketType === 'PROFESSIONAL' && 'プロフェッショナルチケット'}
                      {slot.ticketType === 'ENTERPRISE' && 'エンタープライズチケット'}
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {slot.remainingTickets}
                    </div>
                    <div className="text-xs text-gray-500">
                      残りチケット数 / {slot.totalTickets}枚
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <a
                  href="/tickets"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  チケットを購入する
                </a>
              </div>
            </div>
          </div>

          {/* 招待管理 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">招待管理</h2>
              <a
                href="/invitations"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                招待管理 →
              </a>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600 mb-3">
                ユーザーを招待して、スタンダードチケットを獲得しましょう！
              </div>
              <div className="text-sm text-blue-600">
                1人招待するごとにスタンダードチケットが1枚付与されます
              </div>
            </div>
          </div>

          {/* チケット購入履歴（一部表示） */}
          {ticketPurchases.length > 0 ? (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">チケット購入履歴</h2>
                <a
                  href="/ticket-history"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  すべて表示 →
                </a>
              </div>
              <div className="bg-white rounded-lg border">
                <div className="divide-y divide-gray-200">
                  {ticketPurchases.slice(0, 3).map((purchase) => (
                    <div key={purchase.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">
                            {purchase.ticketType === 'STANDARD' && 'スタンダードチケット'}
                            {purchase.ticketType === 'PROFESSIONAL' && 'プロフェッショナルチケット'}
                            {purchase.ticketType === 'ENTERPRISE' && 'エンタープライズチケット'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(purchase.createdAt).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            ¥{purchase.amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {purchase.currency.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {ticketPurchases.length > 3 && (
                  <div className="p-4 bg-gray-50 text-center">
                    <a
                      href="/ticket-history"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      他 {ticketPurchases.length - 3} 件の購入履歴を表示
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">チケット購入履歴</h2>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-500">チケットの購入履歴がありません</p>
                <p className="text-sm text-gray-400 mt-2">
                  チケットを購入すると、ここに履歴が表示されます
                </p>
              </div>
            </div>
          )}

          {/* エンタープライズチケット用のロゴ設定 */}
          {hasEnterpriseTicket && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">ブランディング設定</h2>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="customLogo" className="block text-sm font-medium text-gray-700 mb-2">
                    オリジナルロゴ（エンタープライズチケット）
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    公開URLのヘッダー部分（LogianSurveyロゴの代わり）に表示されます。企業独自のブランディングが可能です。
                  </p>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      id="customLogo"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {customLogo && (
                      <button
                        type="button"
                        onClick={removeCustomLogo}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        削除
                      </button>
                    )}
                  </div>
                  {customLogo && (
                    <div className="mt-2">
                      <img
                        src={customLogo}
                        alt="カスタムロゴ"
                        className="h-20 w-auto object-cover rounded border"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        公開URLのヘッダー部分（LogianSurveyロゴの代わり）に表示されます
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* アカウント管理 */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">アカウント管理</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-900 mb-2">危険な操作</h3>
              <p className="text-sm text-red-700 mb-3">
                アカウントを削除すると、すべてのデータが永久に削除されます。この操作は取り消すことができません。
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={isSaving}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isSaving ? '削除中...' : 'アカウントを削除'}
              </button>
            </div>
          </div>

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}