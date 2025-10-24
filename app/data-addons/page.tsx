'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface DataStorageAddon {
  id: string
  name: string
  description?: string
  type: 'storage' | 'retention'
  amount: number
  price: number
  isMonthly: boolean
  stripeProductId?: string
  stripePriceId?: string
}

interface UserDataAddon {
  id: string
  status: string
  purchasedAt: string
  expiresAt?: string
  addon: DataStorageAddon
}

interface Survey {
  id: string
  title: string
  status: string
  createdAt: string
}

export default function DataAddonsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'all'
  
  const [storageAddons, setStorageAddons] = useState<DataStorageAddon[]>([])
  const [retentionAddons, setRetentionAddons] = useState<DataStorageAddon[]>([])
  const [userAddons, setUserAddons] = useState<UserDataAddon[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [selectedAddon, setSelectedAddon] = useState<DataStorageAddon | null>(null)

  useEffect(() => {
    if (session) {
      fetchAddons()
      fetchUserAddons()
      fetchSurveys()
    }
  }, [session])

  const fetchAddons = async () => {
    try {
      const [storageResponse, retentionResponse] = await Promise.all([
        fetch(`${window.location.origin}/api/data-addons?type=storage`),
        fetch(`${window.location.origin}/api/data-addons?type=retention`)
      ])

      if (storageResponse.ok) {
        const storageData = await storageResponse.json()
        setStorageAddons(storageData)
      }

      if (retentionResponse.ok) {
        const retentionData = await retentionResponse.json()
        setRetentionAddons(retentionData)
      }
    } catch (error) {
      console.error('Failed to fetch addons:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserAddons = async () => {
    try {
      const response = await fetch(`${window.location.origin}/api/user/data-addons`)
      if (response.ok) {
        const data = await response.json()
        setUserAddons(data)
      }
    } catch (error) {
      console.error('Failed to fetch user addons:', error)
    }
  }

  const fetchSurveys = async () => {
    try {
      const response = await fetch(`${window.location.origin}/api/user/surveys`)
      if (response.ok) {
        const data = await response.json()
        setSurveys(data)
      }
    } catch (error) {
      console.error('Failed to fetch surveys:', error)
    }
  }

  const handlePurchase = async (addon: DataStorageAddon) => {
    if (!session?.user?.id) {
      alert('ログインが必要です')
      return
    }

    // 保存期間延長の場合は、対象アンケートを選択させる
    if (addon.type === 'retention') {
      if (surveys.length === 0) {
        alert('保存期間を延長するアンケートが見つかりません。')
        return
      }
      setSelectedAddon(addon)
      setShowSurveyModal(true)
      return
    }

    // 容量追加の場合は通常の購入フロー
    try {
      const requestUrl = '/api/stripe/create-checkout-session'
      console.log('Request URL:', requestUrl)
      console.log('Window location origin:', window.location.origin)
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: 'DATA_ADDON',
          addonId: addon.id,
          successUrl: `${window.location.origin}/settings?success=true`,
          cancelUrl: `${window.location.origin}/data-addons?canceled=true`
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        }
      } else {
        const errorData = await response.json()
        alert(`購入エラー: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert('購入処理中にエラーが発生しました')
    }
  }

  const handleRetentionPurchase = async (surveyId: string) => {
    if (!selectedAddon || !session?.user?.id) return

    try {
      const requestUrl = '/api/stripe/create-checkout-session'
      console.log('Request URL:', requestUrl)
      console.log('Window location origin:', window.location.origin)
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: 'DATA_ADDON',
          addonId: selectedAddon.id,
          surveyId: surveyId,
          successUrl: `${window.location.origin}/settings?success=true`,
          cancelUrl: `${window.location.origin}/data-addons?canceled=true`
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        }
      } else {
        const errorData = await response.json()
        alert(`購入エラー: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert('購入処理中にエラーが発生しました')
    } finally {
      setShowSurveyModal(false)
      setSelectedAddon(null)
    }
  }

  const getTotalStorage = () => {
    const storageAddons = userAddons.filter(ua => ua.addon.type === 'storage')
    return storageAddons.reduce((total, ua) => total + ua.addon.amount, 0)
  }

  const getTotalRetention = () => {
    const retentionAddons = userAddons.filter(ua => ua.addon.type === 'retention')
    return retentionAddons.reduce((total, ua) => total + ua.addon.amount, 0)
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">データアドオン</h1>
            <Link
              href="/settings"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              設定に戻る
            </Link>
          </div>

          {/* タブ */}
          <div className="flex space-x-1 mb-6">
            <button
              onClick={() => router.push('/data-addons')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                type === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => router.push('/data-addons?type=storage')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                type === 'storage' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              容量追加
            </button>
            <button
              onClick={() => router.push('/data-addons?type=retention')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                type === 'retention' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              保存期間延長
            </button>
          </div>

          {/* 現在のアドオン状況 */}
          {userAddons.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">現在のアドオン</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">追加容量:</span>
                    <span className="ml-2 font-medium">{getTotalStorage()}MB</span>
                  </div>
                  <div>
                    <span className="text-gray-600">延長期間:</span>
                    <span className="ml-2 font-medium">{getTotalRetention()}日</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 容量追加 */}
          {(type === 'all' || type === 'storage') && storageAddons.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">容量追加</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storageAddons.map((addon) => (
                  <div key={addon.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{addon.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        addon.isMonthly ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {addon.isMonthly ? '月額' : '買い切り'}
                      </span>
                    </div>
                    {addon.description && (
                      <p className="text-sm text-gray-600 mb-3">{addon.description}</p>
                    )}
                    <div className="text-2xl font-bold text-gray-900 mb-3">
                      ¥{addon.price.toLocaleString()}
                    </div>
                    <button
                      onClick={() => handlePurchase(addon)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      購入する
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 保存期間延長 */}
          {(type === 'all' || type === 'retention') && retentionAddons.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">保存期間延長</h2>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ 保存期間延長を購入する際は、対象となるアンケートIDの入力が必要です。
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {retentionAddons.map((addon) => (
                  <div key={addon.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{addon.name}</h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        買い切り
                      </span>
                    </div>
                    {addon.description && (
                      <p className="text-sm text-gray-600 mb-3">{addon.description}</p>
                    )}
                    <div className="text-2xl font-bold text-gray-900 mb-3">
                      ¥{addon.price.toLocaleString()}
                    </div>
                    <button
                      onClick={() => handlePurchase(addon)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                    >
                      購入する
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 商品が見つからない場合 */}
          {(type === 'storage' && storageAddons.length === 0) || 
           (type === 'retention' && retentionAddons.length === 0) || 
           (type === 'all' && storageAddons.length === 0 && retentionAddons.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-gray-500">現在利用可能なアドオンはありません。</p>
            </div>
          ) : null}

          {/* アンケート選択モーダル */}
          {showSurveyModal && selectedAddon && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">アンケートを選択</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedAddon.name}を適用するアンケートを選択してください。
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {surveys.map((survey) => (
                    <button
                      key={survey.id}
                      onClick={() => handleRetentionPurchase(survey.id)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium">{survey.title}</div>
                      <div className="text-sm text-gray-500">
                        ステータス: {survey.status} | 作成日: {new Date(survey.createdAt).toLocaleDateString('ja-JP')}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setShowSurveyModal(false)
                      setSelectedAddon(null)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
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
