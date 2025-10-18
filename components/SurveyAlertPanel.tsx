'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SurveyAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  message: string
  surveyId: string
  surveyTitle: string
  severity: 'error' | 'warning' | 'info'
}

interface SurveyAlertPanelProps {
  className?: string
}

const SurveyAlertPanel = ({ className = '' }: SurveyAlertPanelProps) => {
  const [alerts, setAlerts] = useState<SurveyAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/notifications/survey-alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data)
      }
    } catch (error) {
      console.error('Failed to fetch survey alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '🚨'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return 'ℹ️'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-800'
      case 'warning':
        return 'text-yellow-800'
      case 'info':
        return 'text-blue-800'
      default:
        return 'text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-3 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm">アラートを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-3 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-lg mb-1">✅</div>
          <p className="text-sm">アラートはありません</p>
        </div>
      </div>
    )
  }

  const displayedAlerts = isExpanded ? alerts : alerts.slice(0, 3)

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
            アンケートアラート
            <span className="ml-2 text-sm text-gray-500 font-normal">
              ({alerts.length}件)
            </span>
          </h3>
          {alerts.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? '折りたたむ' : 'すべて表示'}
            </button>
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {displayedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`px-4 py-2 border-b border-gray-100 ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <span className="text-sm flex-shrink-0 mr-2">
                  {getSeverityIcon(alert.severity)}
                </span>
                <p className={`text-sm ${getSeverityTextColor(alert.severity)} truncate`}>
                  {alert.message}
                </p>
              </div>
              <Link
                href={`/surveys/${alert.surveyId}/edit`}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0 ml-3"
              >
                設定
              </Link>
            </div>
          </div>
        ))}
      </div>

      {alerts.length > 3 && !isExpanded && (
        <div className="px-4 py-2 text-center border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            他{alerts.length - 3}件を表示
          </button>
        </div>
      )}
    </div>
  )
}

export default SurveyAlertPanel
