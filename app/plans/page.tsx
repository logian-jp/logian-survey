'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PLAN_LIMITS } from '@/lib/plan-limits'

interface UserPlan {
  id: string
  planType: string
  status: string
  startDate: string
  endDate?: string
}

export default function PlansPage() {
  const { data: session } = useSession()
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserPlan()
    }
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
    } finally {
      setIsLoading(false)
    }
  }

  const plans = [
    {
      id: 'FREE',
      name: '基本プラン',
      price: 0,
      description: '個人利用に最適',
      features: [
        'アンケート作成: 3個まで',
        '回答数: 100件/アンケート',
        '基本質問タイプ',
        'CSV出力（通常・正規化データ）',
        'セクション・改ページ機能'
      ],
      limits: PLAN_LIMITS.FREE,
      popular: false
    },
    {
      id: 'ONETIME_UNLIMITED',
      name: '単発無制限プラン',
      price: 10000,
      description: '1回限り・全機能開放',
      features: [
        'アンケート作成: 1個のみ',
        '回答数: 無制限',
        '全質問タイプ・全機能',
        '条件分岐・ファイルアップロード',
        '位置情報取得・リッチテキスト',
        'カスタムブランディング',
        'API連携・優先サポート',
        '全データ形式エクスポート'
      ],
      limits: PLAN_LIMITS.ONETIME_UNLIMITED,
      popular: true
    },
    {
      id: 'STANDARD',
      name: 'スタンダードプラン',
      price: 2980,
      description: '中小企業に最適',
      features: [
        'アンケート作成: 無制限',
        '回答数: 1,000件/アンケート',
        '全質問タイプ',
        '高度な分析機能',
        '条件分岐ロジック',
        '質問テンプレート',
        'チーム機能'
      ],
      limits: PLAN_LIMITS.STANDARD,
      popular: true
    },
    {
      id: 'PROFESSIONAL',
      name: 'プロフェッショナルプラン',
      price: 9800,
      description: '本格的な分析が必要な場合',
      features: [
        'スタンダードの全機能',
        '回答数: 10,000件/アンケート',
        '高度な統計分析',
        'カスタムブランディング',
        'API連携',
        '優先サポート'
      ],
      limits: PLAN_LIMITS.PROFESSIONAL,
      popular: false
    },
    {
      id: 'ENTERPRISE',
      name: 'エンタープライズプラン',
      price: 29800,
      description: '大企業・組織向け',
      features: [
        'プロフェッショナルの全機能',
        '回答数: 無制限',
        '無制限チームメンバー',
        'SSO連携',
        'カスタムドメイン',
        'SLA保証',
        '専任サポート'
      ],
      limits: PLAN_LIMITS.ENTERPRISE,
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
                  <span className="text-gray-600">/月</span>
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

                {userPlan?.planType === plan.id ? (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
                  >
                    現在のプラン
                  </button>
                ) : (
                  <Link
                    href={`/plans/upgrade?plan=${plan.id}`}
                    className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {plan.price === 0 ? '無料で開始' : 'プランを選択'}
                  </Link>
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
