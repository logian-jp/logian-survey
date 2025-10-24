'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface TicketInfo {
  ticketType: string
  name: string
  price: number
  description: string
  features: string[]
  maxResponses: number
  surveyDurationDays: number
  dataRetentionDays: number
  canUseVideoEmbedding: boolean
  canUseLocationTracking: boolean
  canUseNormalization: boolean
  canUseStandardization: boolean
  canUseWebhook: boolean
  canUseAPI: boolean
  canUsePayPayPoints: boolean
}

interface UserTicket {
  id: string
  ticketType: string
  totalTickets: number
  usedTickets: number
  remainingTickets: number
  purchasedAt: string
  expiresAt?: string
}

export default function TicketsPage() {
  const { data: session } = useSession()
  const [userTickets, setUserTickets] = useState<UserTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [modalDiscountCode, setModalDiscountCode] = useState('')
  const [modalDiscountInfo, setModalDiscountInfo] = useState<any>(null)
  const [isValidatingModalDiscount, setIsValidatingModalDiscount] = useState(false)

  const ticketTypes: TicketInfo[] = [
    {
      ticketType: 'FREE',
      name: '無料チケット',
      price: 0,
      description: '基本的なアンケート作成が可能',
      features: ['アンケート作成: 3件', '回答上限: 100件', '募集期間: 30日間', 'データ保存: 90日間'],
      maxResponses: 100,
      surveyDurationDays: 30,
      dataRetentionDays: 90,
      canUseVideoEmbedding: false,
      canUseLocationTracking: false,
      canUseNormalization: false,
      canUseStandardization: false,
      canUseWebhook: false,
      canUseAPI: false,
      canUsePayPayPoints: false
    },
    {
      ticketType: 'STANDARD',
      name: 'スタンダードチケット',
      price: 2980,
      description: '中規模のアンケートに最適',
      features: ['回答上限: 300件', '募集期間: 90日間', 'データ保存: 90日間', '+100件追加: 1,000円'],
      maxResponses: 300,
      surveyDurationDays: 90,
      dataRetentionDays: 90,
      canUseVideoEmbedding: true,
      canUseLocationTracking: false,
      canUseNormalization: false,
      canUseStandardization: false,
      canUseWebhook: false,
      canUseAPI: false,
      canUsePayPayPoints: false
    },
    {
      ticketType: 'PROFESSIONAL',
      name: 'プロフェッショナルチケット',
      price: 10000,
      description: '大規模なアンケートとAPI連携',
      features: ['回答上限: 1,000件', '募集期間: 180日間', 'データ保存: 180日間', 'API連携可能', '+100件追加: 1,000円'],
      maxResponses: 1000,
      surveyDurationDays: 180,
      dataRetentionDays: 180,
      canUseVideoEmbedding: true,
      canUseLocationTracking: true,
      canUseNormalization: true,
      canUseStandardization: true,
      canUseWebhook: true,
      canUseAPI: true,
      canUsePayPayPoints: false
    },
    {
      ticketType: 'ENTERPRISE',
      name: 'エンタープライズチケット',
      price: 50000,
      description: '無制限のアンケートとPayPayポイント連携',
      features: ['回答上限: 無制限', '募集期間: 180日間', 'データ保存: 360日間', 'API連携可能', 'PayPayポイント連携', 'カスタムドメイン'],
      maxResponses: -1,
      surveyDurationDays: 180,
      dataRetentionDays: 360,
      canUseVideoEmbedding: true,
      canUseLocationTracking: true,
      canUseNormalization: true,
      canUseStandardization: true,
      canUseWebhook: true,
      canUseAPI: true,
      canUsePayPayPoints: true
    }
  ]

  useEffect(() => {
    console.log('Tickets page - Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    })
    
    if (session) {
      fetchUserTickets()
    }
  }, [session])

  useEffect(() => {
    // URLパラメータをチェック
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    
    if (success === 'true') {
      setShowSuccessMessage(true)
      // チケット情報を再読み込み
      if (session?.user?.id) {
        fetchUserTickets()
      }
      // URLからパラメータを削除
      window.history.replaceState({}, '', '/tickets')
      // 3秒後に成功メッセージを非表示
      setTimeout(() => setShowSuccessMessage(false), 3000)
    }
    
    if (canceled === 'true') {
      alert('チケット購入がキャンセルされました')
      // URLからパラメータを削除
      window.history.replaceState({}, '', '/tickets')
    }
  }, [session])

  const fetchUserTickets = async () => {
    try {
      const response = await fetch('/api/user/tickets')
      if (response.ok) {
        const data = await response.json()
        setUserTickets(data.tickets || [])
      }
    } catch (error) {
      console.error('Failed to fetch user tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getUserTicketCount = (ticketType: string) => {
    if (ticketType === 'FREE') {
      return 3 // FREEは常に3枚
    }
    const userTicket = userTickets.find(t => t.ticketType === ticketType)
    return userTicket ? userTicket.remainingTickets : 0
  }

  const handlePurchaseTicket = async (ticketType: string) => {
    // 選択されたチケット情報を取得
    const ticket = ticketTypes.find(t => t.ticketType === ticketType)
    if (!ticket) return

    // 確認モーダルを表示
    setSelectedTicket(ticket)
    setModalDiscountCode('')
    setModalDiscountInfo(null)
    setShowCheckoutModal(true)
  }

  const handleConfirmPurchase = async () => {
    if (!selectedTicket) return

    try {
      // Stripe決済セッションを作成
      const response = await fetch('/api/stripe/create-ticket-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticketType: selectedTicket.ticketType, 
          quantity: 1,
          discountCode: modalDiscountCode || undefined
        })
      })
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to create checkout session')
      }
      
      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Failed to start ticket purchase:', error)
      alert('チケット購入に失敗しました')
    } finally {
      setShowCheckoutModal(false)
    }
  }

  const handleTestWebhook = async (ticketType: string) => {
    try {
      const response = await fetch('/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: session?.user?.id, 
          ticketType, 
          quantity: 1 
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Test webhook result:', result)
        alert('テストWebhookが成功しました！チケット数が更新されました。')
        await fetchUserTickets() // チケット情報を再読み込み
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Test webhook failed')
      }
    } catch (error) {
      console.error('Test webhook error:', error)
      alert('テストWebhookに失敗しました: ' + error.message)
    }
  }

  const handleSimulateWebhook = async (ticketType: string) => {
    try {
      // Stripe Webhookイベントをシミュレート
      const webhookEvent = {
        id: 'evt_test_' + Date.now(),
        object: 'event',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_' + Date.now(),
            object: 'checkout.session',
            amount_total: ticketType === 'STANDARD' ? 2980 : ticketType === 'PROFESSIONAL' ? 10000 : 50000,
            currency: 'jpy',
            metadata: {
              userId: session?.user?.id,
              ticketType: ticketType,
              quantity: '1',
              type: 'ticket_purchase'
            }
          }
        }
      }

      const response = await fetch('/api/stripe/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookEvent)
      })
      
      if (response.ok) {
        alert('Webhookシミュレーションが成功しました！チケット数が更新されました。')
        await fetchUserTickets() // チケット情報を再読み込み
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Webhook simulation failed')
      }
    } catch (error) {
      console.error('Webhook simulation error:', error)
      alert('Webhookシミュレーションに失敗しました: ' + error.message)
    }
  }

  const validateModalDiscountCode = async () => {
    if (!modalDiscountCode || !selectedTicket) return

    setIsValidatingModalDiscount(true)
    try {
      const response = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discountCode: modalDiscountCode,
          ticketType: selectedTicket.ticketType
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setModalDiscountInfo(data.discountLink)
      } else {
        const errorData = await response.json()
        alert(`割引コードが無効です: ${errorData.message}`)
        setModalDiscountInfo(null)
      }
    } catch (error) {
      alert(`割引コードの検証中にエラーが発生しました`)
      setModalDiscountInfo(null)
    } finally {
      setIsValidatingModalDiscount(false)
    }
  }

  const clearModalDiscountCode = () => {
    setModalDiscountCode('')
    setModalDiscountInfo(null)
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-4">ログインが必要です</div>
          <Link 
            href="/auth/signin" 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            ログインページへ
          </Link>
        </div>
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">チケット購入</h1>
          <p className="text-lg text-gray-600">アンケート作成に必要なチケットを購入できます</p>
        </div>

        {/* 成功メッセージ */}
        {showSuccessMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              チケットの購入が完了しました！チケット数が更新されました。
            </div>
          </div>
        )}


        {/* 現在のチケット数表示 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">現在のチケット数</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ticketTypes.map((ticket) => {
              const count = getUserTicketCount(ticket.ticketType)
              return (
                <div key={ticket.ticketType} className="bg-white rounded-lg p-4 border">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    {ticket.name}
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {count}
                  </div>
                  <div className="text-xs text-gray-500">
                    残りチケット数
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* チケット一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ticketTypes.map((ticket) => (
            <div key={ticket.ticketType} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {ticket.name}
                </h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  ¥{ticket.price.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {ticket.description}
                </p>
                
                <div className="space-y-2 mb-6">
                  {ticket.features.map((feature, index) => (
                    <div key={index} className="text-sm text-gray-700 flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">現在の所持数</div>
                  <div className="text-xl font-bold text-gray-900">
                    {getUserTicketCount(ticket.ticketType)}枚
                  </div>
                </div>

                {ticket.ticketType !== 'FREE' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handlePurchaseTicket(ticket.ticketType)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      チケットを購入 (¥{ticket.price.toLocaleString()})
                    </button>
                    <button
                      onClick={() => handleTestWebhook(ticket.ticketType)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      テスト（直接）
                    </button>
                    <button
                      onClick={() => handleSimulateWebhook(ticket.ticketType)}
                      className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm"
                    >
                      テスト（Webhook）
                    </button>
                  </div>
                )}

                {ticket.ticketType === 'FREE' && (
                  <div className="text-sm text-gray-500">無料チケットは購入不要（デフォルト3枚）</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 説明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">チケットシステムについて</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>• チケットは1枚で1つのアンケートを作成できます</p>
            <p>• チケットは永続的に有効です（期限なし）</p>
            <p>• 無料チケットは3枚まで所持可能です</p>
            <p>• 有料チケットは何枚でも購入可能です</p>
            <p>• アンケート作成時に使用するチケットを選択できます</p>
          </div>
        </div>
      </div>

      {/* 購入確認モーダル */}
      {showCheckoutModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">購入内容の確認</h3>
            
            <div className="space-y-4">
              {/* チケット情報 */}
              <div className="border rounded-lg p-4">
                <div className="font-semibold text-gray-900">{selectedTicket.name}</div>
                <div className="text-sm text-gray-600 mt-1">{selectedTicket.description}</div>
              </div>

              {/* クーポンコード入力 */}
              <div className="border rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">クーポンコード</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={modalDiscountCode}
                    onChange={(e) => setModalDiscountCode(e.target.value)}
                    placeholder="クーポンコードを入力（任意）"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={validateModalDiscountCode}
                    disabled={!modalDiscountCode || isValidatingModalDiscount}
                    className="px-3 py-2 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
                  >
                    {isValidatingModalDiscount ? '検証中...' : '適用'}
                  </button>
                  {modalDiscountCode && (
                    <button
                      onClick={clearModalDiscountCode}
                      className="px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      クリア
                    </button>
                  )}
                </div>
                {modalDiscountInfo && (
                  <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md">
                    <div className="text-xs text-green-800">
                      <strong>割引適用済み！</strong><br />
                      割引額: {modalDiscountInfo.discountValue}{modalDiscountInfo.discountType === 'PERCENTAGE' ? '%' : '円'}<br />
                      割引後価格: ¥{modalDiscountInfo.discountedPrice.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* 価格情報 */}
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">通常価格:</span>
                  <span className="text-lg font-semibold">¥{selectedTicket.price.toLocaleString()}</span>
                </div>
                
                {modalDiscountInfo && (
                  <>
                    <div className="flex justify-between items-center text-green-600">
                      <span>割引額:</span>
                      <span className="font-semibold">
                        {modalDiscountInfo.discountType === 'PERCENTAGE' 
                          ? `${modalDiscountInfo.discountValue}% OFF`
                          : `¥${modalDiscountInfo.discountValue} OFF`
                        }
                      </span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center text-xl font-bold text-green-600">
                      <span>合計金額:</span>
                      <span>¥{modalDiscountInfo.discountedPrice.toLocaleString()}</span>
                    </div>
                  </>
                )}
                
                {!modalDiscountInfo && (
                  <div className="flex justify-between items-center text-xl font-bold text-gray-900 mt-2">
                    <span>合計金額:</span>
                    <span>¥{selectedTicket.price.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* 利用規約と注意事項 */}
              <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="font-semibold text-yellow-800 mb-2">利用規約・注意事項</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>チケットは永続的に有効です（期限なし）</li>
                  <li>購入後はキャンセル・返金できません</li>
                  <li>決済完了後、チケット数が自動更新されます</li>
                  <li>不正なクーポンコード使用は禁止されています</li>
                  <li>サービス利用規約に同意したものとみなします</li>
                </ul>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {modalDiscountInfo 
                  ? `この金額で決済する (¥${modalDiscountInfo.discountedPrice.toLocaleString()})`
                  : `この金額で決済する (¥${selectedTicket.price.toLocaleString()})`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
