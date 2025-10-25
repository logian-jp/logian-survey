'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DataUsageData {
  totalUsage: {
    systemSize: number
    surveySize: number
    totalSize: number
  }
  userUsage: Array<{
    user: {
      id: string
      name: string
      email: string
    }
    systemSize: number
    surveySize: number
    totalSize: number
  }>
  recentUsage: Array<{
    id: string
    dataType: string
    sizeBytes: number
    description: string
    createdAt: string
    user: {
      name: string
      email: string
    }
  }>
}

const COLORS = {
  system: '#8884d8',
  survey: '#82ca9d',
  other: '#ffc658'
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function AdminDataUsageChart() {
  const [data, setData] = useState<DataUsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDataUsage()
  }, [])

  const fetchDataUsage = async () => {
    try {
      const response = await fetch('/api/admin/data-usage')
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(`Failed to fetch data usage: ${errorData.error || response.statusText}`)
      }
      const result = await response.json()
      console.log('Data usage result:', result)
      setData(result)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">データ使用量</h3>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">データ使用量</h3>
        <div className="text-red-600">エラー: {error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">データ使用量</h3>
        <div>データがありません</div>
      </div>
    )
  }

  // 円グラフ用のデータ
  const pieData = [
    { name: 'アンケートデータ', value: data.totalUsage.surveySize, color: COLORS.survey },
    { name: 'システムデータ', value: data.totalUsage.systemSize, color: COLORS.system }
  ]

  // ユーザー別データ（上位10ユーザー）
  const topUsers = data.userUsage.slice(0, 10).map(user => ({
    name: user.user.name || user.user.email,
    systemSize: user.systemSize,
    surveySize: user.surveySize,
    totalSize: user.totalSize
  }))

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">データ使用量</h3>
      
      {/* 全体統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">総使用量</div>
          <div className="text-2xl font-bold text-blue-900">{formatBytes(data.totalUsage.totalSize)}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">アンケートデータ</div>
          <div className="text-2xl font-bold text-green-900">{formatBytes(data.totalUsage.surveySize)}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">システムデータ</div>
          <div className="text-2xl font-bold text-purple-900">{formatBytes(data.totalUsage.systemSize)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 円グラフ */}
        <div>
          <h4 className="text-md font-semibold mb-3">データタイプ別使用量</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatBytes(value as number)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ユーザー別棒グラフ */}
        <div>
          <h4 className="text-md font-semibold mb-3">ユーザー別使用量（上位10名）</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topUsers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => formatBytes(value)}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value, name) => [
                  formatBytes(value as number), 
                  name === 'systemSize' ? 'システムデータ' : 'アンケートデータ'
                ]}
              />
              <Legend />
              <Bar dataKey="systemSize" stackId="a" fill={COLORS.system} name="システムデータ" />
              <Bar dataKey="surveySize" stackId="a" fill={COLORS.survey} name="アンケートデータ" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 最近の使用状況 */}
      <div className="mt-6">
        <h4 className="text-md font-semibold mb-3">最近のデータ使用状況</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  データタイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  サイズ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  説明
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.recentUsage.slice(0, 10).map((usage) => (
                <tr key={usage.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {usage.user.name || usage.user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      usage.dataType === 'survey_data' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {usage.dataType === 'survey_data' ? 'アンケートデータ' : 'システムデータ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatBytes(usage.sizeBytes)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {usage.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(usage.createdAt).toLocaleString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
