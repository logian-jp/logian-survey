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

interface Announcement {
  id: string
  title: string
  content: string
  priority: number
  status: string
  readAt: string | null
  createdAt: string
  announcementCreatedAt: string
}

interface NotificationPanelProps {
  className?: string
}

export default function NotificationPanel({ className = '' }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'notifications' | 'announcements'>('announcements')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    fetchAnnouncements()
  }, [])

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeModal()
      }
    }

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      // モーダルが開いているときはbodyのスクロールを無効にする
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen])

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
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcements')
      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements || [])
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (announcementId: string) => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST'
      })
      if (response.ok) {
        setAnnouncements(prev => 
          prev.map(announcement => 
            announcement.id === announcementId 
              ? { ...announcement, status: 'READ', readAt: new Date().toISOString() }
              : announcement
          )
        )
      }
    } catch (error) {
      console.error('Failed to mark announcement as read:', error)
    }
  }

  const hideAnnouncement = async (announcementId: string) => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== announcementId))
      }
    } catch (error) {
      console.error('Failed to hide announcement:', error)
    }
  }

  const openAnnouncementModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setIsModalOpen(true)
    // モーダルを開いたときに自動的に既読にする
    if (announcement.status === 'SENT') {
      markAsRead(announcement.id)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedAnnouncement(null)
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

  const unreadAnnouncements = announcements.filter(a => a.status === 'SENT')
  const unreadNotifications = notifications

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* タブヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'announcements'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              お知らせ
              {unreadAnnouncements.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {unreadAnnouncements.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              回答通知
              {unreadNotifications.length > 0 && (
                <span className="ml-1 bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {unreadNotifications.length}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? '折りたたむ' : 'すべて表示'}
          </button>
        </div>
      </div>

      {/* お知らせタブ */}
      {activeTab === 'announcements' && (
        <div className="max-h-96 overflow-y-auto">
          {announcements.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="text-lg mb-1">📢</div>
              <p className="text-sm">新しいお知らせはありません</p>
            </div>
          ) : (
            announcements.slice(0, isExpanded ? announcements.length : 3).map((announcement) => (
              <div key={announcement.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => openAnnouncementModal(announcement)}
                    className="flex items-start flex-1 min-w-0 text-left hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 mt-1 ${
                      announcement.status === 'SENT' ? 'bg-red-500' : 'bg-gray-400'
                    }`}></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {announcement.title}
                        </span>
                        {announcement.priority > 0 && (
                          <span className="bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5 rounded-full">
                            重要
                          </span>
                        )}
                        <span className="text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(announcement.createdAt)}
                        </span>
                      </div>
                      <div 
                        className="text-sm text-gray-600 line-clamp-2"
                        dangerouslySetInnerHTML={{ 
                          __html: announcement.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' 
                        }}
                      />
                      <div className="text-xs text-blue-600 mt-1 hover:underline">
                        詳細を見る →
                      </div>
                    </div>
                  </button>
                  <div className="ml-3 flex space-x-1">
                    {announcement.status === 'SENT' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(announcement.id)
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        既読
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        hideAnnouncement(announcement.id)
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {announcements.length > 3 && !isExpanded && (
            <div className="px-4 py-2 text-center border-t border-gray-200">
              <button
                onClick={() => setIsExpanded(true)}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                他{announcements.length - 3}件を表示
              </button>
            </div>
          )}
        </div>
      )}

      {/* 回答通知タブ */}
      {activeTab === 'notifications' && (
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="text-lg mb-1">📊</div>
              <p className="text-sm">新しい回答はありません</p>
            </div>
          ) : (
            notifications.slice(0, isExpanded ? notifications.length : 3).map((notification) => (
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
            ))
          )}

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
      )}

      {/* お知らせ詳細モーダル */}
      {isModalOpen && selectedAnnouncement && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedAnnouncement.title}
                </h2>
                {selectedAnnouncement.priority > 0 && (
                  <span className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full">
                    重要
                  </span>
                )}
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                <span>配信日時: {new Date(selectedAnnouncement.createdAt).toLocaleString('ja-JP')}</span>
                <span>•</span>
                <span>ステータス: {selectedAnnouncement.status === 'SENT' ? '配信済み' : '配信予定'}</span>
              </div>
              
              <div 
                className="text-gray-900 leading-relaxed space-y-3 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-3 [&>h3]:text-base [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6 [&>li]:mb-1 [&>strong]:font-bold [&>em]:italic [&>u]:underline [&>a]:text-blue-600 [&>a]:underline [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>iframe]:w-full [&>iframe]:h-64 [&>video]:w-full [&>video]:h-64"
                dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
              />
            </div>

            {/* モーダルフッター */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  閉じる
                </button>
              </div>
              <div className="text-sm text-gray-500">
                モーダルを開いた時点で自動的に既読になりました
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
