'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import NotificationPanel from '@/components/NotificationPanel'
import SurveyAlertPanel from '@/components/SurveyAlertPanel'
import { PLAN_LIMITS } from '@/lib/plan-limits'

function formatToTokyoTime(dateString: string): string {
  const date = new Date(dateString)
  const tokyoTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return tokyoTime.toISOString().replace('T', ' ').slice(0, 16)
}

function stripHtmlTags(html: string): string {
  if (!html) return ''
  // HTMLタグを除去
  return html.replace(/<[^>]*>/g, '')
}

interface Survey {
  id: string
  title: string
  description: string | null
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
  createdAt: string
  responseCount: number
  maxResponses: number | null
  endDate: string | null
  targetResponses: number | null
  owner: {
    id: string
    name: string | null
    email: string
  }
  userPermission: 'OWNER' | 'ADMIN' | 'EDIT' | 'VIEW'
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userPlan, setUserPlan] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchSurveys()
      fetchUserPlan()
      fetchTickets()
    }
  }, [session])

  // URLパラメータのrefreshを検出してプラン情報を強制更新
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('refresh') || urlParams.get('plan_updated')) {
      console.log('Refresh or plan_updated parameter detected, forcing plan update')
      fetchUserPlan()
      // URLからパラメータを削除
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])


  const fetchTickets = async () => {
    try {
      console.log('Fetching tickets for dashboard...')
      const response = await fetch('/api/user/tickets')
      if (response.ok) {
        const data = await response.json()
        console.log('Dashboard tickets data:', data)
        setTickets(data.tickets || [])
      } else {
        console.error('Failed to fetch tickets:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    }
  }

  const fetchUserPlan = async (retryCount = 0) => {
    try {
      console.log(`=== Fetching user plan (attempt ${retryCount + 1}) ===`)
      // キャッシュバスターを追加して常に最新の情報を取得
      const url = `/api/user/plan?t=${Date.now()}`
      console.log('Fetching from URL:', url)
      const response = await fetch(url)
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched user plan:', data)
        console.log('Plan type:', data.planType)
        console.log('Plan status:', data.status)
        setUserPlan(data)
      } else {
        // APIエラーの場合はリトライまたは無料プランを設定
        if (retryCount < 2) {
          console.warn(`Failed to fetch user plan, retrying... (${retryCount + 1}/2)`)
          setTimeout(() => fetchUserPlan(retryCount + 1), 1000)
        } else {
          console.warn('Failed to fetch user plan after retries, using FREE plan as fallback')
          setUserPlan({
            id: 'fallback',
            planType: 'FREE',
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: null
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch user plan:', error)
      // エラーの場合はリトライまたは無料プランを設定
      if (retryCount < 2) {
        console.warn(`Network error, retrying... (${retryCount + 1}/2)`)
        setTimeout(() => fetchUserPlan(retryCount + 1), 1000)
      } else {
        setUserPlan({
          id: 'fallback',
          planType: 'FREE',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: null
        })
      }
    }
  }

  // ページがフォーカスされた時にデータを再取得
  useEffect(() => {
    const handleFocus = () => {
      if (session) {
        console.log('Page focused, refreshing data')
        fetchSurveys()
        fetchUserPlan() // プラン情報も更新
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [session])

  const fetchSurveys = async () => {
    try {
      console.log('Dashboard: Fetching surveys...')
      const response = await fetch('/api/surveys')
      if (response.ok) {
        const data = await response.json()
        console.log('Dashboard: Fetched surveys:', data)
        setSurveys(data)
      } else {
        console.error('Dashboard: Failed to fetch surveys, status:', response.status)
      }
    } catch (error) {
      console.error('Dashboard: Failed to fetch surveys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <Link
            href="/surveys/create"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-center sm:text-left"
          >
            新しいアンケートを作成
          </Link>
        </div>

          {/* 通知パネルとアラートパネル */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NotificationPanel />
            <SurveyAlertPanel />
          </div>

          {/* チケット情報の案内 */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">
                    チケットシステム
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-700">
                    <span className="block sm:inline">
                      {tickets.length > 0 ? (
                        tickets.map((ticket, index) => (
                          <span key={ticket.ticketType}>
                            {ticket.ticketType === 'FREE' && '無料チケット'}
                            {ticket.ticketType === 'STANDARD' && 'スタンダードチケット'}
                            {ticket.ticketType === 'PROFESSIONAL' && 'プロフェッショナルチケット'}
                            {ticket.ticketType === 'ENTERPRISE' && 'エンタープライズチケット'}
                            : {ticket.remainingTickets}枚
                            {index < tickets.length - 1 && ', '}
                          </span>
                        ))
                      ) : (
                        '無料チケット: 3枚'
                      )}
                    </span>
                    <span className="hidden sm:inline"> | </span>
                    <span className="block sm:inline">アンケート作成時にチケットを選択</span>
                    <span className="hidden sm:inline"> | </span>
                    <span className="block sm:inline">チケット購入で追加可能</span>
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Link
                    href="/settings"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    設定
                  </Link>
                  <Link
                    href="/tickets"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm"
                  >
                    チケット購入
                  </Link>
                </div>
              </div>
            </div>
          </div>


        {surveys.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              まだアンケートがありません
            </h3>
            <p className="text-gray-600 mb-6">
              最初のアンケートを作成して、分析に最適化されたデータを収集しましょう。
            </p>
            <Link
              href="/surveys/create"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
            >
              アンケートを作成
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {survey.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    survey.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800'
                      : survey.status === 'DRAFT'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {survey.status === 'ACTIVE' ? '公開中' : 
                     survey.status === 'DRAFT' ? '下書き' : '終了'}
                  </span>
                </div>
                
                {survey.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {stripHtmlTags(survey.description)}
                  </p>
                )}
                
                <div className="text-sm text-gray-500 mb-4 space-y-1">
                  <p>回答数: {survey.responseCount}件</p>
                  {survey.endDate && (
                    <p>期限: {formatToTokyoTime(survey.endDate)}</p>
                  )}
                  {survey.maxResponses && (
                    <p>上限: {survey.maxResponses}件</p>
                  )}
                  {survey.targetResponses && !survey.maxResponses && (
                    <p>目標: {survey.targetResponses}件</p>
                  )}
                  {(survey.maxResponses || survey.targetResponses) && (
                    <div className="flex items-center">
                      <span className="mr-2">達成率:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${survey.maxResponses ? 'bg-blue-600' : 'bg-green-600'}`}
                          style={{ 
                            width: `${Math.min(100, ((survey.maxResponses || survey.targetResponses) ? (survey.responseCount / (survey.maxResponses || survey.targetResponses!)) * 100 : 0))}%` 
                          }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs">
                        {Math.round(((survey.maxResponses || survey.targetResponses) ? (survey.responseCount / (survey.maxResponses || survey.targetResponses!)) * 100 : 0))}%
                      </span>
                    </div>
                  )}
                  <p>作成日: {formatToTokyoTime(survey.createdAt).split(' ')[0]}</p>
                  <p>所有者: {survey.owner.name || survey.owner.email}</p>
                  <p>あなたの権限: {
                    survey.userPermission === 'OWNER' ? '所有者' :
                    survey.userPermission === 'ADMIN' ? '管理者' :
                    survey.userPermission === 'EDIT' ? '編集' : '閲覧'
                  }</p>
                </div>
                
                <div className="flex space-x-2">
                  {(survey.userPermission === 'OWNER' || survey.userPermission === 'ADMIN' || survey.userPermission === 'EDIT') && (
                    <Link
                      href={`/surveys/${survey.id}/edit`}
                      className="flex-1 text-center py-2 px-3 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      編集
                    </Link>
                  )}
                  <Link
                    href={`/surveys/${survey.id}/responses`}
                    className={`text-center py-2 px-3 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors ${
                      (survey.userPermission === 'OWNER' || survey.userPermission === 'ADMIN' || survey.userPermission === 'EDIT') 
                        ? 'flex-1' : 'w-full'
                    }`}
                  >
                    回答を見る
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
