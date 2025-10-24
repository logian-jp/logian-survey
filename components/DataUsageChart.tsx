'use client'

import { useState, useEffect } from 'react'

interface DataUsageChartProps {
  userId: string
  planType: string
  maxDataSizeMB: number
}

interface DataUsageData {
  totalMB: number
  usageByType: {
    survey_data: number
    file_upload: number
    export_data: number
  }
}

export default function DataUsageChart({ userId, planType, maxDataSizeMB }: DataUsageChartProps) {
  const [usageData, setUsageData] = useState<DataUsageData | null>(null)
  const [actualMaxDataSizeMB, setActualMaxDataSizeMB] = useState(maxDataSizeMB)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDataUsage()
    fetchMaxDataSize()
  }, [userId, planType])

  const fetchDataUsage = async () => {
    try {
      const response = await fetch(`/api/user/data-usage?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUsageData(data)
      }
    } catch (error) {
      console.error('Failed to fetch data usage:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMaxDataSize = async () => {
    try {
      const response = await fetch(`/api/user/max-data-size?userId=${userId}&planType=${planType}`)
      if (response.ok) {
        const data = await response.json()
        setActualMaxDataSizeMB(data.maxDataSizeMB)
      }
    } catch (error) {
      console.error('Failed to fetch max data size:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!usageData) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">データ使用量</h3>
        <p className="text-gray-500">データ使用量の取得に失敗しました</p>
      </div>
    )
  }

  const usagePercentage = actualMaxDataSizeMB === -1 ? 0 : (usageData.totalMB / actualMaxDataSizeMB) * 100
  const isNearLimit = usagePercentage > 80
  const isOverLimit = usagePercentage > 100

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">データ使用量</h3>
        <span className={`px-2 py-1 rounded-full text-sm font-medium ${
          isOverLimit 
            ? 'bg-red-100 text-red-800' 
            : isNearLimit 
            ? 'bg-yellow-100 text-yellow-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {usageData.totalMB.toFixed(1)}MB / {actualMaxDataSizeMB === -1 ? '無制限' : `${actualMaxDataSizeMB}MB`}
        </span>
      </div>

      {/* 使用量バー */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>使用量</span>
          <span>{usagePercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              isOverLimit 
                ? 'bg-red-500' 
                : isNearLimit 
                ? 'bg-yellow-500' 
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* データ種別別の使用量 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">データ種別別使用量</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">アンケートデータ</span>
            <span className="text-sm font-medium">{usageData.usageByType.survey_data.toFixed(1)}MB</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">ファイルアップロード</span>
            <span className="text-sm font-medium">{usageData.usageByType.file_upload.toFixed(1)}MB</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">エクスポートデータ</span>
            <span className="text-sm font-medium">{usageData.usageByType.export_data.toFixed(1)}MB</span>
          </div>
        </div>
      </div>

      {isOverLimit && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>警告:</strong> データ使用量が上限を超えています。プランのアップグレードを検討してください。
          </p>
        </div>
      )}

      {isNearLimit && !isOverLimit && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>注意:</strong> データ使用量が上限の80%を超えています。
          </p>
        </div>
      )}
    </div>
  )
}
