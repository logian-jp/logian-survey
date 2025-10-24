'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PLAN_LIMITS } from '@/lib/plan-limits'
import StripeCheckout from '@/components/StripeCheckout'

interface UserPlan {
  id: string
  planType: string
  status: string
  startDate: string
  endDate?: string
}

interface PlanConfig {
  id: string
  planType: string
  name: string
  price: number
  features: string[]
  limits: any
  isActive: boolean
}

export default function PlansPage() {
  const { data: session } = useSession()
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [planConfigs, setPlanConfigs] = useState<PlanConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [surveys, setSurveys] = useState<any[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('')

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserPlan()
      fetchUserSurveys()
    }
    fetchPlanConfigs()
  }, [session])

  const fetchUserPlan = async () => {
    try {
      const response = await fetch('/api/user/plan')
      if (response.ok) {
        const data = await response.json()
        setUserPlan(data)
      }
    } catch (error) {
      console.error('Failed to fetch user plan:', error)
    }
  }

  const fetchPlanConfigs = async () => {
    try {
      const response = await fetch('/api/plans')
      if (response.ok) {
        const data = await response.json()
        setPlanConfigs(data)
      }
    } catch (error) {
      console.error('Failed to fetch plan configs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserSurveys = async () => {
    try {
      const res = await fetch('/api/surveys')
      if (res.ok) {
        const data = await res.json()
        // 所有アンケートのみを優先して表示（なければ全アクセス可能なもの）
        const owned = data.filter((s: any) => s.userPermission === 'OWNER')
        setSurveys(owned.length > 0 ? owned : data)
        if ((owned.length > 0 ? owned : data).length > 0) {
          setSelectedSurveyId((owned.length > 0 ? owned : data)[0].id)
        }
      }
    } catch (e) {
      // 無視（UIのみの補助機能）
    }
  }

  // 新しい単発プラン構造
  const plans = [
    {
      id: 'FREE',
      name: '無料プラン',
      price: 0,
      description: '個人利用に最適',
      features: [
        'アンケート作成: 3件',
        '各アンケート回答上限: 100件',
        '回答募集期間: 最大30日間',
        'データ保存期間: 90日間',
        'YouTube埋め込み不可',
        '正規化・標準化エクスポートなし'
      ],
      limits: { maxResponses: 100, surveyDurationDays: 30, dataRetentionDays: 90 },
      popular: false
    },
    {
      id: 'STANDARD',
      name: 'スタンダードプラン',
      price: 2980,
      description: '小規模〜中規模調査に最適',
      features: [
        '1つのアンケート回答上限: 300件',
        '回答募集期間: 最大90日間',
        'データ保存期間: 90日間'
      ],
      limits: { maxResponses: 300, surveyDurationDays: 90, dataRetentionDays: 90 },
      popular: true
    },
    {
      id: 'PROFESSIONAL',
      name: 'プロフェッショナルプラン',
      price: 10000,
      description: '本格的な調査に最適',
      features: [
        '1つのアンケート回答上限: 1000件',
        '回答募集期間: 最大180日',
        'データ保存期間: 180日',
        'Webhook/API連携可能'
      ],
      limits: { maxResponses: 1000, surveyDurationDays: 180, dataRetentionDays: 180 },
      popular: false
    },
    {
      id: 'ENTERPRISE',
      name: 'エンタープライズプラン',
      price: 50000,
      description: '大規模調査・エンタープライズ向け',
      features: [
        '1つのアンケート回答上限: 無制限',
        '回答募集期間: 最大180日',
        'データ保存期間: 360日',
        'Webhook/API連携可能',
        'PayPayポイント施策の構築（別途セットアップ費）',
        'API発行・報酬履歴ログ出力'
      ],
      limits: { maxResponses: -1, surveyDurationDays: 180, dataRetentionDays: 360 },
      popular: false
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            プラン選択
          </h1>
          <p className="text-xl text-gray-600">
            あなたに最適なプランをお選びください
          </p>
          {userPlan && (
            <div className="mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      現在のプラン: {plans.find(p => p.id === userPlan.planType)?.name}
                    </h3>
                    <p className="text-sm text-blue-700">
                      ¥{plans.find(p => p.id === userPlan.planType)?.price.toLocaleString()}/月
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      userPlan.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {userPlan.status === 'ACTIVE' ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-blue-600">
                  <p>開始日: {new Date(userPlan.startDate).toLocaleDateString('ja-JP')}</p>
                  {userPlan.endDate && (
                    <p>終了日: {new Date(userPlan.endDate).toLocaleDateString('ja-JP')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    人気
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ¥{plan.price.toLocaleString()}
                  </span>
                  {plan.price > 0 && <span className="text-gray-600">/回</span>}
                </div>

                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.price > 0 && surveys.length > 0 && (
                  <div className="mb-4 text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">対象アンケート</label>
                    <select
                      value={selectedSurveyId}
                      onChange={(e) => setSelectedSurveyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    >
                      {surveys.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">この購入を適用するアンケートを選択してください。</p>
                  </div>
                )}

                {userPlan?.planType === plan.id ? (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
                  >
                    現在のプラン
                  </button>
                ) : plan.price === 0 ? (
                  <Link
                    href={`/plans/upgrade?plan=${plan.id}`}
                    className="w-full py-3 px-6 rounded-lg font-medium transition-colors bg-gray-900 text-white hover:bg-gray-800"
                  >
                    無料で開始
                  </Link>
                ) : (
                  <StripeCheckout
                    planType={plan.id}
                    planName={plan.name}
                    price={plan.price}
                    surveyId={selectedSurveyId || undefined}
                    onSuccess={() => {
                      // 成功時の処理
                      fetchUserPlan()
                    }}
                    onError={(error) => {
                      console.error('Payment error:', error)
                      alert(`決済エラー: ${error}`)
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="flex justify-center space-x-6">
            <Link
              href="/dashboard"
              className="text-primary hover:text-primary/80 font-medium"
            >
              ← ダッシュボードに戻る
            </Link>
            <Link
              href="/settings"
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              ⚙️ 設定ページ
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
