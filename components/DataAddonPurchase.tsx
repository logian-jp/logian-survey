'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

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

interface DataAddonPurchaseProps {
  userId: string
  planType: string
}

export default function DataAddonPurchase({ userId, planType }: DataAddonPurchaseProps) {
  const { data: session } = useSession()
  const [storageAddons, setStorageAddons] = useState<DataStorageAddon[]>([])
  const [retentionAddons, setRetentionAddons] = useState<DataStorageAddon[]>([])
  const [userAddons, setUserAddons] = useState<UserDataAddon[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAddons()
    fetchUserAddons()
  }, [])

  const fetchAddons = async () => {
    try {
      const [storageResponse, retentionResponse] = await Promise.all([
        fetch('/api/data-addons?type=storage'),
        fetch('/api/data-addons?type=retention')
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
      const response = await fetch('/api/user/data-addons')
      if (response.ok) {
        const data = await response.json()
        setUserAddons(data)
      }
    } catch (error) {
      console.error('Failed to fetch user addons:', error)
    }
  }

  const handlePurchase = async (addon: DataStorageAddon) => {
    if (!session?.user?.id) {
      alert('ログインが必要です')
      return
    }

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: 'DATA_ADDON',
          addonId: addon.id,
          successUrl: `${window.location.origin}/settings?success=true`,
          cancelUrl: `${window.location.origin}/settings?canceled=true`
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

  const getTotalStorage = () => {
    const storageAddons = userAddons.filter(ua => ua.addon.type === 'storage')
    return storageAddons.reduce((total, ua) => total + ua.addon.amount, 0)
  }

  const getTotalRetention = () => {
    const retentionAddons = userAddons.filter(ua => ua.addon.type === 'retention')
    return retentionAddons.reduce((total, ua) => total + ua.addon.amount, 0)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 現在のアドオン状況 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">現在のアドオン</h3>
        {userAddons.length > 0 ? (
          <div className="space-y-3">
            {userAddons.map((userAddon) => (
              <div key={userAddon.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">{userAddon.addon.name}</div>
                  <div className="text-sm text-gray-600">
                    {userAddon.addon.type === 'storage' ? '容量追加' : '保存期間延長'}: 
                    {userAddon.addon.amount}{userAddon.addon.type === 'storage' ? 'MB' : '日'}
                    {userAddon.addon.isMonthly && ' (月額)'}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  購入日: {new Date(userAddon.purchasedAt).toLocaleDateString('ja-JP')}
                  {userAddon.expiresAt && (
                    <div>期限: {new Date(userAddon.expiresAt).toLocaleDateString('ja-JP')}</div>
                  )}
                </div>
              </div>
            ))}
            <div className="pt-3 border-t">
              <div className="text-sm text-gray-600">
                合計追加容量: {getTotalStorage()}MB
              </div>
              <div className="text-sm text-gray-600">
                合計延長期間: {getTotalRetention()}日
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">購入済みのアドオンはありません</p>
        )}
      </div>

      {/* 容量追加 */}
      {storageAddons.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">容量追加</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storageAddons.map((addon) => (
              <div key={addon.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">{addon.name}</h4>
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
      {retentionAddons.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">保存期間延長</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {retentionAddons.map((addon) => (
              <div key={addon.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">{addon.name}</h4>
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
    </div>
  )
}
