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
  stripeProductId?: string
  stripePriceId?: string
  isActive: boolean
  isMonthly: boolean
  createdAt: string
  updatedAt: string
}

export default function DataAddonsAdmin() {
  const { data: session } = useSession()
  const [addons, setAddons] = useState<DataStorageAddon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAddon, setEditingAddon] = useState<DataStorageAddon | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchAddons()
  }, [])

  const fetchAddons = async () => {
    try {
      const response = await fetch('/api/admin/data-addons')
      if (response.ok) {
        const data = await response.json()
        setAddons(data)
      }
    } catch (error) {
      console.error('Failed to fetch addons:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncStripe = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/admin/stripe/sync-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'addons' })
      })

      if (response.ok) {
        const data = await response.json()
        alert('Stripe商品・価格の同期が完了しました')
        fetchAddons() // データを再取得
      } else {
        alert('Stripe同期に失敗しました')
      }
    } catch (error) {
      console.error('Error syncing Stripe:', error)
      alert('Stripe同期中にエラーが発生しました')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleCreateAddon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch('/api/admin/data-addons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          type: formData.get('type'),
          amount: parseInt(formData.get('amount') as string),
          price: parseInt(formData.get('price') as string),
          stripeProductId: formData.get('stripeProductId'),
          stripePriceId: formData.get('stripePriceId'),
          isActive: formData.get('isActive') === 'on',
          isMonthly: formData.get('isMonthly') === 'on'
        })
      })

      if (response.ok) {
        setShowCreateForm(false)
        fetchAddons()
      }
    } catch (error) {
      console.error('Failed to create addon:', error)
    }
  }

  const handleUpdateAddon = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingAddon) return

    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch(`/api/admin/data-addons/${editingAddon.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          type: formData.get('type'),
          amount: parseInt(formData.get('amount') as string),
          price: parseInt(formData.get('price') as string),
          stripeProductId: formData.get('stripeProductId'),
          stripePriceId: formData.get('stripePriceId'),
          isActive: formData.get('isActive') === 'on',
          isMonthly: formData.get('isMonthly') === 'on'
        })
      })

      if (response.ok) {
        setEditingAddon(null)
        fetchAddons()
      }
    } catch (error) {
      console.error('Failed to update addon:', error)
    }
  }

  const handleDeleteAddon = async (id: string) => {
    if (!confirm('このアドオンを削除しますか？')) return

    try {
      const response = await fetch(`/api/admin/data-addons/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchAddons()
      }
    } catch (error) {
      console.error('Failed to delete addon:', error)
    }
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center">ログインが必要です</div>
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">データアドオン管理</h1>
            <div className="flex space-x-3">
              <button
                onClick={handleSyncStripe}
                disabled={isSyncing}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSyncing ? '同期中...' : 'Stripeと同期'}
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                新しいアドオンを作成
              </button>
            </div>
          </div>

          {/* アドオン一覧 */}
          <div className="space-y-4">
            {addons.map((addon) => (
              <div key={addon.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{addon.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        addon.type === 'storage' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {addon.type === 'storage' ? '容量追加' : '保存期間延長'}
                      </span>
                      {addon.isMonthly && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          月額
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        addon.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {addon.isActive ? '有効' : '無効'}
                      </span>
                    </div>
                    {addon.description && (
                      <p className="text-gray-600 mb-2">{addon.description}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      <p>数量: {addon.amount}{addon.type === 'storage' ? 'MB' : '日'}</p>
                      <p>価格: ¥{addon.price.toLocaleString()}</p>
                      {addon.stripeProductId && <p>Stripe Product ID: {addon.stripeProductId}</p>}
                      {addon.stripePriceId && <p>Stripe Price ID: {addon.stripePriceId}</p>}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingAddon(addon)}
                      className="bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteAddon(addon.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 作成フォーム */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">新しいアドオンを作成</h2>
                <form onSubmit={handleCreateAddon} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea
                      name="description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
                    <select
                      name="type"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="storage">容量追加</option>
                      <option value="retention">保存期間延長</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                    <input
                      type="number"
                      name="amount"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）</label>
                    <input
                      type="number"
                      name="price"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Product ID</label>
                    <input
                      type="text"
                      name="stripeProductId"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID</label>
                    <input
                      type="text"
                      name="stripePriceId"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input type="checkbox" name="isActive" defaultChecked className="mr-2" />
                      有効
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" name="isMonthly" className="mr-2" />
                      月額
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      作成
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 編集フォーム */}
          {editingAddon && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">アドオンを編集</h2>
                <form onSubmit={handleUpdateAddon} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingAddon.name}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                    <textarea
                      name="description"
                      defaultValue={editingAddon.description || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">タイプ</label>
                    <select
                      name="type"
                      defaultValue={editingAddon.type}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="storage">容量追加</option>
                      <option value="retention">保存期間延長</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                    <input
                      type="number"
                      name="amount"
                      defaultValue={editingAddon.amount}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）</label>
                    <input
                      type="number"
                      name="price"
                      defaultValue={editingAddon.price}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Product ID</label>
                    <input
                      type="text"
                      name="stripeProductId"
                      defaultValue={editingAddon.stripeProductId || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID</label>
                    <input
                      type="text"
                      name="stripePriceId"
                      defaultValue={editingAddon.stripePriceId || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input type="checkbox" name="isActive" defaultChecked={editingAddon.isActive} className="mr-2" />
                      有効
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" name="isMonthly" defaultChecked={editingAddon.isMonthly} className="mr-2" />
                      月額
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingAddon(null)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      更新
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
