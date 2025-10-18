'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PLAN_LIMITS } from '@/lib/plan-limits'

export default function UpgradePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')
  const urlDiscountCode = searchParams.get('discountCode')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [discountCode, setDiscountCode] = useState(urlDiscountCode || '')
  const [discountInfo, setDiscountInfo] = useState<any>(null)
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false)
  const [currentUserPlan, setCurrentUserPlan] = useState<any>(null)

  const plan = planId ? {
    id: planId,
    ...PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS]
  } : null

  // 現在のユーザープランを取得
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const response = await fetch('/api/user/plan')
        if (response.ok) {
          const data = await response.json()
          setCurrentUserPlan(data)
        }
      } catch (error) {
        console.error('Failed to fetch current plan:', error)
      }
    }

    if (session?.user?.id) {
      fetchCurrentPlan()
    }
  }, [session?.user?.id])

  const planNames: Record<string, string> = {
    FREE: '基本プラン',
    ONETIME_UNLIMITED: '単発無制限プラン',
    STANDARD: 'スタンダードプラン',
    PROFESSIONAL: 'プロフェッショナルプラン',
    ENTERPRISE: 'エンタープライズプラン'
  }

  // プランの価格順序（低い順）
  const planOrder = ['FREE', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE', 'ONETIME_UNLIMITED']

  // アップグレード/ダウングレードの判定
  const getPlanChangeType = () => {
    if (!currentUserPlan || !plan) return 'upgrade'
    
    const currentPlanIndex = planOrder.indexOf(currentUserPlan.planType)
    const targetPlanIndex = planOrder.indexOf(plan.id)
    
    if (currentPlanIndex === -1 || targetPlanIndex === -1) return 'upgrade'
    
    if (targetPlanIndex > currentPlanIndex) {
      return 'upgrade'
    } else if (targetPlanIndex < currentPlanIndex) {
      return 'downgrade'
    } else {
      return 'same'
    }
  }

  const planChangeType = getPlanChangeType()

  const validateDiscountCode = useCallback(async () => {
    if (!discountCode || !plan) return

    setIsValidatingDiscount(true)
    try {
      const response = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discountCode,
          planType: plan.id
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDiscountInfo(data.discountLink)
      } else {
        const errorData = await response.json()
        alert(`割引コードが無効です: ${errorData.message}`)
        setDiscountInfo(null)
      }
    } catch (error) {
      alert(`割引コードの検証中にエラーが発生しました`)
      setDiscountInfo(null)
    } finally {
      setIsValidatingDiscount(false)
    }
  }, [discountCode, plan?.id]) // plan.idのみを依存配列に含める

  // URLから割引コードが取得された場合、自動的に検証
  useEffect(() => {
    if (urlDiscountCode && plan) {
      const validateCode = async () => {
        if (!discountCode || !plan) return

        setIsValidatingDiscount(true)
        try {
          const response = await fetch('/api/discount/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              discountCode,
              planType: plan.id
            }),
          })

          if (response.ok) {
            const data = await response.json()
            setDiscountInfo(data.discountLink)
          } else {
            const errorData = await response.json()
            alert(`割引コードが無効です: ${errorData.message}`)
            setDiscountInfo(null)
          }
        } catch (error) {
          alert(`割引コードの検証中にエラーが発生しました`)
          setDiscountInfo(null)
        } finally {
          setIsValidatingDiscount(false)
        }
      }
      
      validateCode()
    }
  }, [urlDiscountCode, plan?.id, discountCode]) // 必要な依存関係のみ

  const handleUpgrade = async () => {
    if (!plan || !session?.user?.id) return

    setIsProcessing(true)
    
    // 擬似的な決済処理（実際のStripe連携は後で実装）
    try {
      const finalPrice = discountInfo ? discountInfo.discountedPrice : plan.price
      console.log(`Processing upgrade: ${plan.id} - ¥${finalPrice}`)
      
      const response = await fetch('/api/user/upgrade-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: plan.id,
          paymentMethod: 'card', // 擬似的な決済方法
          amount: finalPrice,
          discountCode: discountCode || null
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Upgrade successful:', result)
        setIsSuccess(true)
        // 3秒後にダッシュボードにリダイレクト
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      } else {
        const errorData = await response.json()
        console.error('Upgrade failed:', errorData)
        alert(`プランアップグレードに失敗しました: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      alert('エラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-xl font-semibold text-gray-900 mb-2">プランが見つかりません</div>
          <div className="text-gray-600 mb-4">
            指定されたプランID: <code className="bg-gray-100 px-2 py-1 rounded">{planId}</code>
          </div>
          <div className="text-sm text-gray-500 mb-6">
            利用可能なプラン: {Object.keys(PLAN_LIMITS).join(', ')}
          </div>
          <Link
            href="/plans"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            ← プラン選択に戻る
          </Link>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {planChangeType === 'downgrade' ? 'ダウングレード完了！' : 'アップグレード完了！'}
            </h2>
            <p className="text-gray-600 mb-6">
              {planNames[plan.id]}に{planChangeType === 'downgrade' ? 'ダウングレード' : 'アップグレード'}しました。
            </p>
            <p className="text-sm text-gray-500">
              ダッシュボードに自動的にリダイレクトされます...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {planChangeType === 'downgrade' ? 'プランダウングレード' : 'プランアップグレード'}
            </h1>
            <p className="text-gray-600">
              以下のプランに{planChangeType === 'downgrade' ? 'ダウングレード' : 'アップグレード'}します
            </p>
          </div>

          {/* プラン詳細 */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {planNames[plan.id]}
              </h3>
              <div className="text-right">
                {discountInfo ? (
                  <div>
                    <div className="text-lg text-gray-400 line-through">
                      ¥{plan.price.toLocaleString()}
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ¥{discountInfo.discountedPrice.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">
                      {discountInfo.discountType === 'PERCENTAGE' 
                        ? `${discountInfo.discountValue}%割引` 
                        : `¥${discountInfo.discountValue.toLocaleString()}割引`}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      ¥{plan.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">/月</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>アンケート作成数:</span>
                <span>{plan.maxSurveys === -1 ? '無制限' : `${plan.maxSurveys}個`}</span>
              </div>
              <div className="flex justify-between">
                <span>回答数上限:</span>
                <span>{plan.maxResponsesPerSurvey === -1 ? '無制限' : `${plan.maxResponsesPerSurvey}件/アンケート`}</span>
              </div>
              <div className="flex justify-between">
                <span>エクスポート形式:</span>
                <span>{plan.exportFormats.join(', ')}</span>
              </div>
            </div>
          </div>

          {/* 割引コード入力 */}
          <div className="mb-8">
            <label htmlFor="discountCode" className="block text-sm font-medium text-gray-700 mb-2">
              割引コード（お持ちの場合）
            </label>
            <div className="flex space-x-2">
              <input
                id="discountCode"
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="割引コードを入力"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              />
              <button
                type="button"
                onClick={validateDiscountCode}
                disabled={!discountCode || isValidatingDiscount}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidatingDiscount ? '検証中...' : '適用'}
              </button>
            </div>
            
            {/* 割引情報表示 */}
            {discountInfo && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      割引が適用されました！
                    </p>
                    <p className="text-sm text-green-700">
                      {discountInfo.name} - ¥{plan.price.toLocaleString()} → ¥{discountInfo.discountedPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 擬似的な決済フォーム */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              決済情報
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カード番号
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                  disabled
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    有効期限
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    disabled
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ これはデモ版です。実際の決済は行われません。
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-4">
            <Link
              href="/plans"
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium text-center hover:bg-gray-400 transition-colors"
            >
              キャンセル
            </Link>
            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              className="flex-1 bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '処理中...' : `¥${(discountInfo ? discountInfo.discountedPrice : plan.price).toLocaleString()}で${planChangeType === 'downgrade' ? 'ダウングレード' : 'アップグレード'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
