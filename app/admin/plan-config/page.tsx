'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PlanConfig {
  id: string
  planType: string
  name: string
  description?: string
  price: number
  features: string[]
  limits: {
    maxSurveys: number
    maxResponsesPerSurvey: number
    exportFormats: string[]
  }
  isActive: boolean
  sortOrder: number
  stripeProductId?: string
  stripePriceId?: string
}

export default function PlanConfigPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanConfig | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<any[]>([])
  const [newPlan, setNewPlan] = useState({
    planType: '',
    name: '',
    description: '',
    price: 0,
    features: [] as string[],
    limits: {
      maxSurveys: 0,
      maxResponsesPerSurvey: 0,
      exportFormats: [] as string[]
    },
    isActive: true,
    sortOrder: 0
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
    
    fetchPlanConfigs()
  }, [session, status, router])

  const fetchPlanConfigs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/plan-config')
      if (response.ok) {
        const data = await response.json()
        setPlanConfigs(data)
      } else {
        alert('プラン設定の取得に失敗しました')
      }
    } catch (error) {
      console.error('Error fetching plan configs:', error)
      alert('プラン設定の取得中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/admin/plan-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlan),
      })

      if (response.ok) {
        setNewPlan({
          planType: '',
          name: '',
          description: '',
          price: 0,
          features: [],
          limits: {
            maxSurveys: 0,
            maxResponsesPerSurvey: 0,
            exportFormats: []
          },
          isActive: true,
          sortOrder: 0
        })
        setShowCreateForm(false)
        fetchPlanConfigs()
      } else {
        alert('プラン設定の作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating plan config:', error)
      alert('プラン設定の作成中にエラーが発生しました')
    }
  }

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlan) return

    try {
      const response = await fetch(`/api/admin/plan-config/${editingPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingPlan),
      })

      if (response.ok) {
        setEditingPlan(null)
        fetchPlanConfigs()
      } else {
        alert('プラン設定の更新に失敗しました')
      }
    } catch (error) {
      console.error('Error updating plan config:', error)
      alert('プラン設定の更新中にエラーが発生しました')
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm('このプラン設定を削除しますか？')) return

    try {
      const response = await fetch(`/api/admin/plan-config/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchPlanConfigs()
      } else {
        alert('プラン設定の削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting plan config:', error)
      alert('プラン設定の削除中にエラーが発生しました')
    }
  }

  const addFeature = () => {
    setNewPlan(prev => ({
      ...prev,
      features: [...prev.features, '']
    }))
  }

  const updateFeature = (index: number, value: string) => {
    setNewPlan(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => i === index ? value : feature)
    }))
  }

  const removeFeature = (index: number) => {
    setNewPlan(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }))
  }

  const handleSyncStripe = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/admin/stripe/sync-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'plans' })
      })

      if (response.ok) {
        const data = await response.json()
        setSyncResults(data.results)
        alert('Stripe商品・価格の同期が完了しました')
        fetchPlanConfigs() // データを再取得
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">プラン設定管理</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSyncStripe}
              disabled={isSyncing}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSyncing ? '同期中...' : 'Stripe同期'}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              {showCreateForm ? 'フォームを閉じる' : '新しいプランを作成'}
            </button>
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              管理画面に戻る
            </Link>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">新しいプランを作成</h2>
            <form onSubmit={handleCreatePlan} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">プランタイプ</label>
                  <input
                    type="text"
                    value={newPlan.planType}
                    onChange={(e) => setNewPlan({ ...newPlan, planType: e.target.value })}
                    placeholder="例: PREMIUM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">プラン名</label>
                  <input
                    type="text"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="例: プレミアムプラン"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                  <input
                    type="text"
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                    placeholder="例: 中小企業に最適"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）</label>
                  <input
                    type="text"
                    value={newPlan.price}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || /^\d+$/.test(value)) {
                        setNewPlan({ ...newPlan, price: value === '' ? 0 : parseInt(value) })
                      }
                    }}
                    placeholder="例: 2980"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最大アンケート数</label>
                  <input
                    type="number"
                    value={newPlan.limits.maxSurveys}
                    onChange={(e) => setNewPlan({ 
                      ...newPlan, 
                      limits: { ...newPlan.limits, maxSurveys: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最大回答数/アンケート</label>
                  <input
                    type="number"
                    value={newPlan.limits.maxResponsesPerSurvey}
                    onChange={(e) => setNewPlan({ 
                      ...newPlan, 
                      limits: { ...newPlan.limits, maxResponsesPerSurvey: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">機能</label>
                {newPlan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder="例: 高度な分析機能"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  機能を追加
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">エクスポート形式</label>
                <div className="space-y-2">
                  {['raw', 'normalized', 'standardized'].map(format => (
                    <label key={format} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPlan.limits.exportFormats.includes(format)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewPlan(prev => ({
                              ...prev,
                              limits: {
                                ...prev.limits,
                                exportFormats: [...prev.limits.exportFormats, format]
                              }
                            }))
                          } else {
                            setNewPlan(prev => ({
                              ...prev,
                              limits: {
                                ...prev.limits,
                                exportFormats: prev.limits.exportFormats.filter(f => f !== format)
                              }
                            }))
                          }
                        }}
                        className="mr-2"
                      />
                      {format}
                    </label>
                  ))}
                </div>
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
                  プランを作成
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 編集フォーム */}
        {editingPlan && (
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">プランを編集</h2>
            <form onSubmit={handleUpdatePlan} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">プランタイプ</label>
                <input
                  type="text"
                  value={editingPlan.planType}
                  onChange={(e) => setEditingPlan({ ...editingPlan, planType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">プラン名</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
                <input
                  type="text"
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">価格（円）</label>
                <input
                  type="text"
                  value={editingPlan.price}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || /^\d+$/.test(value)) {
                      setEditingPlan({ ...editingPlan, price: value === '' ? 0 : parseInt(value) })
                    }
                  }}
                  placeholder="例: 2980"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大アンケート数</label>
                <input
                  type="text"
                  value={editingPlan.limits.maxSurveys}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || /^-?\d+$/.test(value)) {
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          maxSurveys: value === '' ? 0 : parseInt(value)
                        }
                      })
                    }
                  }}
                  placeholder="-1で無制限"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大回答数</label>
                <input
                  type="text"
                  value={editingPlan.limits.maxResponsesPerSurvey}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || /^-?\d+$/.test(value)) {
                      setEditingPlan({
                        ...editingPlan,
                        limits: {
                          ...editingPlan.limits,
                          maxResponsesPerSurvey: value === '' ? 0 : parseInt(value)
                        }
                      })
                    }
                  }}
                  placeholder="-1で無制限"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">機能</label>
                <div className="space-y-2">
                  {editingPlan.features.map((feature, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...editingPlan.features]
                          newFeatures[index] = e.target.value
                          setEditingPlan({ ...editingPlan, features: newFeatures })
                        }}
                        placeholder="例: 高度な分析機能"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFeatures = editingPlan.features.filter((_, i) => i !== index)
                          setEditingPlan({ ...editingPlan, features: newFeatures })
                        }}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditingPlan({ ...editingPlan, features: [...editingPlan.features, ''] })}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    機能を追加
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">エクスポート形式</label>
                <div className="space-y-2">
                  {['raw', 'normalized', 'standardized'].map(format => (
                    <label key={format} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingPlan.limits.exportFormats.includes(format)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingPlan({
                              ...editingPlan,
                              limits: {
                                ...editingPlan.limits,
                                exportFormats: [...editingPlan.limits.exportFormats, format]
                              }
                            })
                          } else {
                            setEditingPlan({
                              ...editingPlan,
                              limits: {
                                ...editingPlan.limits,
                                exportFormats: editingPlan.limits.exportFormats.filter(f => f !== format)
                              }
                            })
                          }
                        }}
                        className="mr-2"
                      />
                      {format}
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  更新
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stripe同期結果 */}
        {syncResults.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Stripe同期結果</h2>
            <div className="space-y-3">
              {syncResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg ${
                  result.status === 'synced' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{result.name}</div>
                      <div className="text-sm text-gray-600">{result.planType}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.status === 'synced' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status === 'synced' ? '同期成功' : '同期失敗'}
                      </span>
                    </div>
                  </div>
                  {result.status === 'synced' && (
                    <div className="mt-2 text-xs text-gray-500">
                      <div>商品ID: {result.stripeProductId?.slice(-8)}</div>
                      <div>価格ID: {result.stripePriceId?.slice(-8)}</div>
                    </div>
                  )}
                  {result.error && (
                    <div className="mt-2 text-xs text-red-600">
                      エラー: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    プラン名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    価格
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    制限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stripe連携
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {planConfigs.map((plan) => (
                  <tr key={plan.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                        <div className="text-sm text-gray-500">{plan.planType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{plan.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>アンケート: {plan.limits.maxSurveys === -1 ? '無制限' : `${plan.limits.maxSurveys}個`}</div>
                        <div>回答数: {plan.limits.maxResponsesPerSurvey === -1 ? '無制限' : `${plan.limits.maxResponsesPerSurvey}件`}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {plan.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        {plan.stripeProductId ? (
                          <>
                            <div className="text-xs text-green-600">✓ 商品連携済み</div>
                            <div className="text-xs text-gray-500">ID: {plan.stripeProductId.slice(-8)}</div>
                          </>
                        ) : (
                          <div className="text-xs text-red-600">✗ 未連携</div>
                        )}
                        {plan.stripePriceId && (
                          <div className="text-xs text-gray-500">価格ID: {plan.stripePriceId.slice(-8)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="text-primary hover:text-primary/80 mr-4"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
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
