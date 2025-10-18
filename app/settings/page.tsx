'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface UserPlan {
  id: string
  planType: string
  status: string
  startDate: string
  endDate?: string
}

export default function SettingsPage() {
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

  const planNames: Record<string, string> = {
    FREE: '基本プラン',
    STANDARD: 'スタンダードプラン',
    PROFESSIONAL: 'プロフェッショナルプラン',
    ENTERPRISE: 'エンタープライズプラン'
  }

  const planPrices: Record<string, number> = {
    FREE: 0,
    STANDARD: 2980,
    PROFESSIONAL: 9800,
    ENTERPRISE: 29800
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            設定
          </h1>
          <p className="text-gray-600">
            アカウント設定とプラン管理を行えます
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 現在のプラン情報 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                現在のプラン
              </h2>
              
              {userPlan ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {planNames[userPlan.planType]}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ¥{planPrices[userPlan.planType].toLocaleString()}/月
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

                  <div className="text-sm text-gray-600">
                    <p>開始日: {new Date(userPlan.startDate).toLocaleDateString('ja-JP')}</p>
                    {userPlan.endDate && (
                      <p>終了日: {new Date(userPlan.endDate).toLocaleDateString('ja-JP')}</p>
                    )}
                  </div>

                  <div className="pt-4">
                    <Link
                      href="/plans"
                      className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                    >
                      プランを変更
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">プラン情報を取得できませんでした</p>
                  <Link
                    href="/plans"
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                  >
                    プランを選択
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* アカウント情報 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                アカウント情報
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">名前</label>
                  <p className="text-sm text-gray-900">{session?.user?.name || '未設定'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                  <p className="text-sm text-gray-900">{session?.user?.email}</p>
                </div>
              </div>
            </div>

            {/* クイックアクション */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                クイックアクション
              </h3>
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  📊 ダッシュボード
                </Link>
                <Link
                  href="/surveys"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  📝 アンケート一覧
                </Link>
                <Link
                  href="/surveys/create"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  ➕ アンケート作成
                </Link>
                <Link
                  href="/plans"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                  💳 プラン選択
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
