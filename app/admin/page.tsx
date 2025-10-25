'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import UserCountChart from '@/components/UserCountChart'
import AdminDataUsageChart from '@/components/AdminDataUsageChart'

interface AdminStats {
  overview: {
    totalUsers: number
    totalSurveys: number
    totalResponses: number
    activeUsers: number
    surveysByStatus: Record<string, number>
  }
  recentUsers: Array<{
    id: string
    name: string | null
    email: string
    createdAt: string
  }>
  recentSurveys: Array<{
    id: string
    title: string
    status: string
    createdAt: string
    user: {
      name: string | null
      email: string
    }
    _count: {
      responses: number
    }
  }>
  topUsers: Array<{
    id: string
    name: string | null
    email: string
    _count: {
      surveys: number
    }
  }>
  userStatistics: Array<{
    id: string
    name: string | null
    email: string
    createdAt: string
    updatedAt: string
    totalSurveyResponses: number
    activeSurveys: number
    draftSurveys: number
    closedSurveys: number
    surveys: Array<{
      id: string
      title: string
      status: string
      createdAt: string
      _count: {
        responses: number
      }
    }>
  }>
}

interface AnalyticsData {
  // 基本統計
  totalUsers: number
  totalSurveys: number
  totalResponses: number
  newUsersThisMonth: number
  newUsersLastMonth: number
  userGrowthRate: number
  
  // 売上情報
  monthlyRevenue: number
  revenueBreakdown: { [key: string]: number }
  predictedNextMonthRevenue: number
  revenueGrowthRate: number
  
  // 分析データ
  userGrowthData: Array<{
    month: string
    newUsers: number
    totalUsers: number
  }>
  inactiveUsers: number
  churnRiskUsers: Array<{
    id: string
    email: string
    name: string | null
    lastLoginAt: string | null
    planType: string
  }>
  
  // プラン別統計
  planUserBreakdown: Array<{
    planType: string
    planName: string
    userCount: number
  }>
  
  // 計算日時
  calculatedAt: string
}

interface TicketStats {
  ticketStats: Array<{
    ticketType: string
    ticketName: string
    purchased: number
    total: number
    used: number
    remaining: number
    usageRate: number
    revenue: number
  }>
  monthlyRevenue: Array<{
    date: string
    revenue: number
  }>
  totalRevenue: number
  totalTickets: number
  totalUsedTickets: number
  overallUsageRate: number
  period: {
    days: number
    startDate: string
    endDate: string
  }
}

interface InvitationStats {
  summary: {
    totalInvitations: number
    usedInvitations: number
    pendingInvitations: number
    successRate: number
  }
  invitations: Array<{
    id: string
    code: string
    inviterName: string | null
    inviterEmail: string
    invitedName: string | null
    invitedEmail: string | null
    message: string | null
    isUsed: boolean
    usedAt: string | null
    createdAt: string
    expiresAt: string | null
    inviter: {
      id: string
      name: string | null
      email: string
    }
    usedByUser: {
      id: string
      name: string | null
      email: string
    } | null
  }>
  inviterBreakdown: Array<{
    inviterId: string
    inviterName: string
    inviterEmail: string
    totalInvited: number
    successfulInvites: number
    successRate: number
  }>
}

interface TicketPurchase {
  id: string
  ticketType: string
  amount: number
  currency: string
  checkoutSessionId: string
  metadata: any
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    createdAt: string
  }
  survey: {
    id: string
    title: string
    shareUrl: string
    createdAt: string
  } | null
}

interface TicketPurchaseStats {
  totalPurchases: number
  totalAmount: number
  averageAmount: number
}

interface TicketPurchaseFilters {
  userId: string
  ticketType: string
  startDate: string
  endDate: string
  minAmount: string
  maxAmount: string
  search: string
  page: number
  limit: number
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [invitationStats, setInvitationStats] = useState<InvitationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'raw' | 'normalized' | 'standardized'>('raw')
  const [includePersonalData, setIncludePersonalData] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    fetchStats()
  }, [session, status])


  const fetchStats = async () => {
    try {
      const [statsResponse, ticketStatsResponse, invitationStatsResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/ticket-stats'),
        fetch('/api/admin/invitation-stats')
      ])
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      } else if (statsResponse.status === 403) {
        alert('管理者権限が必要です')
        router.push('/dashboard')
        return
      }
      
      // analyticsResponse を一時的に無効化
      // if (analyticsResponse.ok) {
      //   const analyticsData = await analyticsResponse.json()
      //   setAnalytics(analyticsData.data)
      // }

      if (ticketStatsResponse.ok) {
        const ticketStatsData = await ticketStatsResponse.json()
        console.log('Ticket stats data received:', ticketStatsData)
        setTicketStats(ticketStatsData)
      } else {
        const errorData = await ticketStatsResponse.json().catch(() => ({}))
        console.error('Failed to fetch ticket stats:', ticketStatsResponse.status, ticketStatsResponse.statusText, errorData)
      }

      if (invitationStatsResponse.ok) {
        const invitationStatsData = await invitationStatsResponse.json()
        console.log('Invitation stats data received:', invitationStatsData)
        setInvitationStats(invitationStatsData)
      } else {
        const errorData = await invitationStatsResponse.json().catch(() => ({}))
        console.error('Failed to fetch invitation stats:', invitationStatsResponse.status, invitationStatsResponse.statusText, errorData)
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const downloadAllData = async () => {
    setIsDownloading(true)
    try {
      const params = new URLSearchParams({
        format: selectedFormat,
        includePersonalData: includePersonalData.toString(),
      })
      
      const url = `/api/admin/export-all?${params}`
      const response = await fetch(url)
      
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `all_surveys_${selectedFormat}_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        alert('データのダウンロードに失敗しました')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('データのダウンロードに失敗しました')
    } finally {
      setIsDownloading(false)
    }
  }


  const formatToTokyoTime = (dateString: string): string => {
    const date = new Date(dateString)
    const tokyoTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
    return tokyoTime.toISOString().replace('T', ' ').slice(0, 16)
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">ログインが必要です</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">データの取得に失敗しました</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Logian管理画面</h1>
              <p className="text-sm text-gray-600">システム全体の統計情報とデータ管理</p>
            </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ユーザーダッシュボードに戻る
                </Link>
              </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 管理機能メニュー */}
        <div className="mb-8 bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">管理機能</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                href="/admin/purchases"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">チケット購入履歴</h3>
                    <p className="text-sm text-gray-500">全ユーザーのチケット購入履歴を確認・管理</p>
                  </div>
                </div>
              </Link>
              
              <Link
                href="/admin/discount-links"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">割引リンク管理</h3>
                    <p className="text-sm text-gray-500">割引コードの発行・管理</p>
                  </div>
                </div>
              </Link>
              
              <Link
                href="/admin/announcements"
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">お知らせ管理</h3>
                    <p className="text-sm text-gray-500">ユーザー向けお知らせの作成・配信</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* チケット統計 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">チケット統計</h2>
          {ticketStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* チケット使用率 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">チケット使用率</h3>
                <div className="space-y-4">
                  {ticketStats.ticketStats.map((ticket) => (
                    <div key={ticket.ticketType} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{ticket.ticketName}</span>
                        <span className="text-sm text-gray-500">
                          {ticket.usageRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(ticket.usageRate, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mt-2">
                        <span>使用済み: {ticket.used}枚</span>
                        <span>残り: {ticket.remaining}枚</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>発行枚数: {ticket.total}枚</span>
                        <span>購入: {ticket.purchased}回</span>
                      </div>
                      {ticket.revenue > 0 && (
                        <div className="text-sm text-green-600 mt-1">
                          売上: ¥{ticket.revenue.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">全体使用率</span>
                    <span className="text-lg font-semibold text-blue-600">
                      {ticketStats.overallUsageRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    総発行枚数: {ticketStats.totalTickets}枚 / 使用済み: {ticketStats.totalUsedTickets}枚
                  </div>
                </div>
              </div>

              {/* チケット売上推移 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">チケット売上推移</h3>
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ¥{ticketStats.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    過去{ticketStats.period.days}日間の売上
                  </div>
                  {ticketStats.totalRevenue === 0 && (
                    <div className="text-sm text-orange-600 mt-2">
                      ※ まだチケットの購入がありません
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={200} minWidth={300} minHeight={200}>
                  <LineChart data={ticketStats.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`¥${(value ?? 0).toLocaleString()}`, '売上']}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('ja-JP')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center text-gray-500">
                <p>チケット統計データを読み込み中...</p>
                <p className="text-sm mt-2">データが表示されない場合は、ブラウザのコンソールでエラーを確認してください。</p>
              </div>
            </div>
          )}
        </div>

               {/* 招待統計 */}
               <div className="mb-8">
                 <div className="flex justify-between items-center mb-4">
                   <h2 className="text-xl font-semibold text-gray-900">招待統計</h2>
                   <Link
                     href="/admin/invitations"
                     className="text-sm text-blue-600 hover:text-blue-800"
                   >
                     招待履歴一覧を見る →
                   </Link>
                 </div>
          {invitationStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 招待サマリー */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">招待サマリー</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {invitationStats.summary.totalInvitations}
                    </div>
                    <div className="text-sm text-blue-800">総招待数</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {invitationStats.summary.usedInvitations}
                    </div>
                    <div className="text-sm text-green-800">成功数</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {invitationStats.summary.pendingInvitations}
                    </div>
                    <div className="text-sm text-yellow-800">未使用</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {invitationStats.summary.successRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-800">成功率</div>
                  </div>
                </div>
              </div>

              {/* 招待者別統計 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">招待者別統計</h3>
                <div className="space-y-3">
                  {invitationStats.inviterBreakdown.map((inviter) => (
                    <div key={inviter.inviterId} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{inviter.inviterName}</div>
                          <div className="text-sm text-gray-500">{inviter.inviterEmail}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {inviter.successfulInvites}/{inviter.totalInvited}
                          </div>
                          <div className="text-xs text-gray-500">
                            {inviter.successRate.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(inviter.successRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center text-gray-500">
                <p>招待統計データを読み込み中...</p>
              </div>
            </div>
          )}
        </div>

        {/* 招待履歴 */}
        {invitationStats && (
          <div className="mb-8 bg-white shadow-sm rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">招待履歴</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">招待者</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">招待コード</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">招待相手</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">招待日時</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用日時</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitationStats.invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{invitation.inviter.name || invitation.inviter.email}</div>
                          <div className="text-gray-500">{invitation.inviter.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {invitation.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.invitedName || invitation.invitedEmail || '未指定'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invitation.isUsed ? (
                          <div className="flex items-center">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              使用済み
                            </span>
                            {invitation.usedByUser && (
                              <div className="ml-2 text-xs text-gray-500">
                                by {invitation.usedByUser.name || invitation.usedByUser.email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            未使用
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatToTokyoTime(invitation.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invitation.usedAt ? formatToTokyoTime(invitation.usedAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 経営KPI */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">経営KPI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 今月売上 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">💰</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">今月売上</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ¥{analytics?.monthlyRevenue?.toLocaleString() || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 来月売上予測 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📈</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">来月売上予測</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ¥{analytics?.predictedNextMonthRevenue?.toLocaleString() || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* ユーザー成長率 */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">ユーザー成長率</dt>
                      <dd className={`text-lg font-medium ${
                        (analytics?.userGrowthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analytics?.userGrowthRate?.toFixed(1) || 0}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* 解約リスクユーザー */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">⚠️</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">解約リスク</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {analytics?.churnRiskUsers.length || 0}人
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 売上予測 */}
        {analytics && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">売上予測</h2>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">月別売上推移</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">今月売上</span>
                      <span className="text-lg font-semibold text-gray-900">
                        ¥{analytics.monthlyRevenue?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-600">来月予測</span>
                      <span className="text-lg font-semibold text-blue-600">
                        ¥{analytics.predictedNextMonthRevenue?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-gray-600">成長率</span>
                      <span className={`text-lg font-semibold ${
                        (analytics.revenueGrowthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {analytics.revenueGrowthRate?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">売上予測グラフ</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={[
                      { month: '今月', revenue: analytics.monthlyRevenue },
                      { month: '来月予測', revenue: analytics.predictedNextMonthRevenue }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`¥${(value ?? 0).toLocaleString()}`, '売上']} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 売上分析 */}
        {analytics && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">売上分析</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 売上内訳 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">今月売上内訳</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(analytics.revenueBreakdown).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(Number(percent) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(analytics.revenueBreakdown).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`¥${(value ?? 0).toLocaleString()}`, '売上']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* プラン別ユーザー数 */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">プラン別ユーザー数</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.planUserBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="planName" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}人`, 'ユーザー数']} />
                    <Bar dataKey="userCount" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ユーザー数推移 */}
        <div className="mb-8">
          <UserCountChart />
        </div>

        {/* 解約リスクユーザー */}
        {analytics && analytics.churnRiskUsers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">解約リスクユーザー</h2>
            <div className="bg-white shadow rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">プラン</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最終ログイン</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.churnRiskUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{user.name || '未設定'}</div>
                            <div className="text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.planType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLoginAt ? formatToTokyoTime(user.lastLoginAt) : '未更新'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* データダウンロード */}
        <div className="mb-8 bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">全データダウンロード</h2>
            <p className="text-sm text-gray-600 mt-1">全ユーザーのアンケートデータを一括ダウンロードできます</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-2">
                  出力形式
                </label>
                <select
                  id="format"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as 'raw' | 'normalized' | 'standardized')}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="raw">通常データ</option>
                  <option value="normalized">正規化データ</option>
                  <option value="standardized">標準化データ</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  id="includePersonalData"
                  name="includePersonalData"
                  type="checkbox"
                  checked={includePersonalData}
                  onChange={(e) => setIncludePersonalData(e.target.checked)}
                  className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                />
                <label htmlFor="includePersonalData" className="ml-2 block text-sm text-gray-700">
                  個人情報を含める
                </label>
              </div>
              <div className="flex items-end">
                <button
                  onClick={downloadAllData}
                  disabled={isDownloading}
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isDownloading ? 'ダウンロード中...' : '全データダウンロード'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* データ使用量 */}
        <div className="mb-8">
          <AdminDataUsageChart />
        </div>

        {/* 最近のユーザー */}
        <div className="mb-8 bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">最近登録されたユーザー</h2>
              <Link
                href="/admin/users"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ユーザー一覧を見る →
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メール</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登録日時</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name || '未設定'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatToTokyoTime(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 最近のアンケート */}
        <div className="mb-8 bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">最近作成されたアンケート</h2>
              <Link
                href="/admin/surveys"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                アンケート一覧を見る →
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アンケート名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">回答数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日時</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentSurveys.map((survey) => (
                  <tr key={survey.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {survey.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {survey.user.name || survey.user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        survey.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        survey.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {survey.status === 'ACTIVE' ? '公開中' :
                         survey.status === 'DRAFT' ? '下書き' : '終了'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {survey._count.responses}件
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatToTokyoTime(survey.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ユーザー統計 */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">ユーザー別統計</h2>
              <Link
                href="/admin/users"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                ユーザー一覧を見る →
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ユーザー</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アンケート数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">総回答数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">公開中</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">下書き</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">終了</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.userStatistics.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{user.name || '未設定'}</div>
                        <div className="text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.surveys.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.totalSurveyResponses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.activeSurveys}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.draftSurveys}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.closedSurveys}
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
