'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Invitation {
  id: string
  code: string
  invitedEmail?: string
  invitedName?: string
  message?: string
  isUsed: boolean
  usedAt?: string
  usedByUser?: {
    name: string
    email: string
  }
  createdAt: string
  expiresAt?: string
}

interface UserInvitationStats {
  maxInvitations: number
  usedInvitations: number
  remainingInvitations: number
}

export default function InvitationsPage() {
  const { data: session } = useSession()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState<UserInvitationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newInvitation, setNewInvitation] = useState({
    invitedEmail: '',
    invitedName: '',
    message: ''
  })

  useEffect(() => {
    if (session) {
      fetchInvitations()
      fetchStats()
    }
  }, [session])

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations/list')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations || [])
      } else {
        console.error('Failed to fetch invitations:', await response.text())
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/invitations/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        console.error('Failed to fetch stats:', await response.text())
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvitation)
      })

      if (response.ok) {
        const data = await response.json()
        alert(`招待リンクが作成されました！\n\n招待URL: ${data.invitation.url}`)
        setNewInvitation({ invitedEmail: '', invitedName: '', message: '' })
        setShowCreateForm(false)
        fetchInvitations()
        fetchStats()
      } else {
        const errorData = await response.json()
        alert(`招待作成に失敗しました: ${errorData.message}`)
      }
    } catch (error) {
      console.error('Failed to create invitation:', error)
      alert('招待作成に失敗しました')
    } finally {
      setIsCreating(false)
    }
  }

  const copyInvitationLink = (code: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/invite/${code}`
    navigator.clipboard.writeText(invitationUrl)
    alert('招待リンクをクリップボードにコピーしました！')
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">招待管理</h1>
              <p className="text-gray-600 mt-2">ユーザーを招待して、チケットを獲得しましょう</p>
            </div>
            <Link
              href="/settings"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← 設定に戻る
            </Link>
          </div>
        </div>

        {/* 招待統計 */}
        {stats && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">招待状況</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.usedInvitations}
                </div>
                <div className="text-sm text-gray-500">招待済み</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.remainingInvitations}
                </div>
                <div className="text-sm text-gray-500">残り招待可能数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.maxInvitations}
                </div>
                <div className="text-sm text-gray-500">最大招待数</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 1人招待するごとにスタンダードチケットが1枚付与されます！
              </p>
            </div>
          </div>
        )}

        {/* 招待作成フォーム */}
        {stats && stats.remainingInvitations > 0 && (
          <div className="mb-8">
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                新しい招待を作成
              </button>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">招待を作成</h3>
                <form onSubmit={handleCreateInvitation} className="space-y-4">
                  <div>
                    <label htmlFor="invitedEmail" className="block text-sm font-medium text-gray-700">
                      招待するメールアドレス（任意）
                    </label>
                    <input
                      type="email"
                      id="invitedEmail"
                      value={newInvitation.invitedEmail}
                      onChange={(e) => setNewInvitation(prev => ({ ...prev, invitedEmail: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="招待する人のメールアドレス"
                    />
                  </div>

                  <div>
                    <label htmlFor="invitedName" className="block text-sm font-medium text-gray-700">
                      招待する人の名前（任意）
                    </label>
                    <input
                      type="text"
                      id="invitedName"
                      value={newInvitation.invitedName}
                      onChange={(e) => setNewInvitation(prev => ({ ...prev, invitedName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="招待する人の名前"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                      メッセージ（任意）
                    </label>
                    <textarea
                      id="message"
                      rows={3}
                      value={newInvitation.message}
                      onChange={(e) => setNewInvitation(prev => ({ ...prev, message: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="招待メッセージを入力してください"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCreating ? '作成中...' : '招待を作成'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 招待一覧 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">招待履歴</h2>
          </div>
          
          {invitations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              まだ招待を作成していません
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-medium text-gray-900">
                              {invitation.invitedName || invitation.invitedEmail || '招待リンク'}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invitation.isUsed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invitation.isUsed ? '使用済み' : '未使用'}
                            </span>
                          </div>
                          
                          {invitation.invitedEmail && (
                            <div className="text-sm text-gray-500 mt-1">
                              {invitation.invitedEmail}
                            </div>
                          )}
                          
                          {invitation.message && (
                            <div className="text-sm text-gray-600 mt-1">
                              {invitation.message}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-400 mt-2">
                            作成日: {new Date(invitation.createdAt).toLocaleDateString('ja-JP')}
                            {invitation.usedAt && (
                              <span className="ml-4">
                                使用日: {new Date(invitation.usedAt).toLocaleDateString('ja-JP')}
                              </span>
                            )}
                          </div>

                          {invitation.isUsed && invitation.usedByUser && (
                            <div className="text-sm text-green-600 mt-2">
                              ✅ {invitation.usedByUser.name}さんが登録しました
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      {!invitation.isUsed && (
                        <button
                          onClick={() => copyInvitationLink(invitation.code)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          リンクをコピー
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
