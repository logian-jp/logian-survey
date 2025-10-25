'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnnouncementType } from '@prisma/client'
import RichTextEditor from '@/components/RichTextEditor'

interface ConditionConfig {
  type: 'survey_inactivity' | 'downgrade' | 'subscription_months' | 'plan_usage'
  value?: number
  operator?: 'gt' | 'lt' | 'eq' // greater than, less than, equal
  unit?: 'days' | 'months' | 'percentage'
}

export default function CreateAnnouncementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'MANUAL' as AnnouncementType,
    priority: 0,
    scheduledAt: '',
    targetPlans: [] as string[],
    conditions: [] as ConditionConfig[]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
          targetPlans: formData.targetPlans.length > 0 ? formData.targetPlans : null,
          conditions: formData.type === 'CONDITIONAL' ? formData.conditions : null
        }),
      })

      if (response.ok) {
        router.push('/admin/announcements')
      } else {
        const error = await response.json()
        alert(`エラー: ${error.message}`)
      }
    } catch (err) {
      alert('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, { type: 'survey_inactivity' }]
    }))
  }

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }

  const updateCondition = (index: number, field: keyof ConditionConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }))
  }

  const ticketTypes = ['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE']

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">お知らせ作成</h1>
          <p className="text-gray-600 mt-2">新しいお知らせを作成します</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">基本情報</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  タイトル *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="お知らせのタイトルを入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容 *
                </label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                  placeholder="お知らせの内容を入力（太字、色変更、動画埋め込み等が可能）"
                  allowVideo={true}
                  ticketType="ENTERPRISE"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    配信タイプ
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as AnnouncementType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MANUAL">手動配信</option>
                    <option value="SCHEDULED">時間型配信</option>
                    <option value="CONDITIONAL">条件型配信</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    優先度
                  </label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {formData.type === 'SCHEDULED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    配信日時
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
            </div>
          </div>

          {/* 対象チケット設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">対象チケット</h2>
            <div className="space-y-2">
              {ticketTypes.map((ticketType) => (
                <label key={ticketType} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.targetPlans.includes(ticketType)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ 
                          ...prev, 
                          targetPlans: [...prev.targetPlans, ticketType] 
                        }))
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          targetPlans: prev.targetPlans.filter(p => p !== ticketType) 
                        }))
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{ticketType}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              何も選択しない場合は全チケットが対象になります
            </p>
          </div>

          {/* 条件型配信の設定 */}
          {formData.type === 'CONDITIONAL' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">配信条件</h2>
                <button
                  type="button"
                  onClick={addCondition}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  条件を追加
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.conditions.map((condition, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium">条件 {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeCondition(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        削除
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          条件タイプ
                        </label>
                        <select
                          value={condition.type}
                          onChange={(e) => updateCondition(index, 'type', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="survey_inactivity">アンケート作成頻度</option>
                          <option value="downgrade">プランダウングレード</option>
                          <option value="subscription_months">契約期間</option>
                          <option value="plan_usage">プラン使用率</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          値
                        </label>
                        <input
                          type="number"
                          value={condition.value || ''}
                          onChange={(e) => updateCondition(index, 'value', parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="数値"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          単位
                        </label>
                        <select
                          value={condition.unit || 'days'}
                          onChange={(e) => updateCondition(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="days">日</option>
                          <option value="months">月</option>
                          <option value="percentage">%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
                
                {formData.conditions.length === 0 && (
                  <p className="text-gray-500 text-center py-4">
                    配信条件を追加してください
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
