'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  surveyId: string
  surveyTitle: string
  respondentId: string
  createdAt: string
  answerCount: number
}

interface NotificationPanelProps {
  className?: string
}

export default function NotificationPanel({ className = '' }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      console.log('Fetching notifications...')
      const response = await fetch('/api/notifications/recent-responses')
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Received notifications:', data)
        setNotifications(data)
      } else {
        console.error('Failed to fetch notifications, status:', response.status)
        const errorData = await response.json()
        console.error('Error data:', errorData)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'たった今'
    if (diffInMinutes < 60) return `${diffInMinutes}分前`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}時間前`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}日前`
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-3 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-lg mb-1">📊</div>
          <p className="text-sm">新しい回答はありません</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            新規回答通知
            <span className="ml-2 text-sm text-gray-500 font-normal">
              ({notifications.length}件)
            </span>
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? '折りたたむ' : 'すべて表示'}
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.slice(0, isExpanded ? notifications.length : 3).map((notification) => (
          <div key={notification.id} className="px-4 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 flex-shrink-0"></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-gray-900 truncate">
                      {notification.surveyTitle}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 truncate">
                      {notification.respondentId}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {notification.answerCount}件
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href={`/surveys/${notification.surveyId}/responses`}
                className="ml-3 text-xs text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
              >
                詳細
              </Link>
            </div>
          </div>
        ))}
      </div>

      {notifications.length > 3 && !isExpanded && (
        <div className="px-4 py-2 text-center border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            他{notifications.length - 3}件を表示
          </button>
        </div>
      )}
    </div>
  )
}
