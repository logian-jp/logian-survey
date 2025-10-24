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

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'raw' | 'normalized' | 'standardized'>('raw')
  const [includePersonalData, setIncludePersonalData] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

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
      const [statsResponse, ticketStatsResponse] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/ticket-stats')
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

  const initializePlanConfig = async () => {
    setIsInitializing(true)
    try {
      const response = await fetch('/api/admin/init-plan-config', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`プラン設定を初期化しました: ${result.count}個のプランが作成されました`)
        // データを再取得
        fetchStats()
      } else {
        const errorData = await response.json()
        alert(`プラン設定の初期化に失敗しました: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Plan config initialization error:', error)
      alert('プラン設定の初期化中にエラーが発生しました')
    } finally {
      setIsInitializing(false)
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
                <button
                  onClick={initializePlanConfig}
                  disabled={isInitializing}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isInitializing ? '初期化中...' : 'プラン設定初期化'}
                </button>
                <Link
                  href="/admin/plan-config"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  プラン設定管理
                </Link>
                <Link
                  href="/admin/discount-links"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  割引リンク管理
                </Link>
                <Link
                  href="/admin/announcements"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                >
                  お知らせ管理
                </Link>
                <Link
                  href="/admin/data-addons"
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
                >
                  データアドオン管理
                </Link>
                <Link
                  href="/admin/purchases"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                >
                  購入履歴管理
                </Link>
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
            <h2 className="text-lg font-semibold text-gray-900">最近登録されたユーザー</h2>
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
            <h2 className="text-lg font-semibold text-gray-900">最近作成されたアンケート</h2>
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
            <h2 className="text-lg font-semibold text-gray-900">ユーザー別統計</h2>
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
