'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  updatedAt: string
  _count: {
    surveys: number
  }
  surveys: Array<{
    id: string
    status: string
    _count: {
      responses: number
    }
  }>
  // 計算された統計情報
  totalSurveys: number
  activeSurveys: number
  draftSurveys: number
  closedSurveys: number
  totalResponses: number
  publishRate: number
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    dateRange: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  })
  
  // ロール変更用の状態
  const [roleChangeModal, setRoleChangeModal] = useState({
    isOpen: false,
    user: null as User | null,
    newRole: '',
    password: '',
    confirmChecked: false
  })

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }
    
    if (session.user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    
    fetchUsers()
  }, [session, status, pagination.page, filters])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      })

      const response = await fetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setPagination(data.pagination)
      } else {
        console.error('Failed to fetch users:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchUsers()
  }

  const handleSort = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // ロール変更モーダルを開く
  const openRoleChangeModal = (user: User) => {
    setRoleChangeModal({
      isOpen: true,
      user,
      newRole: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
      password: '',
      confirmChecked: false
    })
  }

  // ロール変更モーダルを閉じる
  const closeRoleChangeModal = () => {
    setRoleChangeModal({
      isOpen: false,
      user: null,
      newRole: '',
      password: '',
      confirmChecked: false
    })
  }

  // ロール変更を実行
  const handleRoleChange = async () => {
    if (!roleChangeModal.user || !roleChangeModal.password || !roleChangeModal.confirmChecked) {
      alert('パスワードを入力し、確認チェックボックスにチェックを入れてください。')
      return
    }

    try {
      const response = await fetch('/api/admin/users/change-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: roleChangeModal.user.id,
          newRole: roleChangeModal.newRole,
          password: roleChangeModal.password
        })
      })

      if (response.ok) {
        alert('ロールが正常に変更されました。')
        closeRoleChangeModal()
        fetchUsers() // ユーザー一覧を再取得
        
        // セッションを更新（変更されたユーザーが自分自身の場合）
        if (roleChangeModal.user?.id === session?.user?.id) {
          // セッションを強制的に更新するため、ページをリロード
          alert('ロールが変更されました。ページをリロードしてセッションを更新します。')
          window.location.reload()
        }
      } else {
        const error = await response.json()
        alert(`エラー: ${error.message}`)
      }
    } catch (error) {
      console.error('Failed to change role:', error)
      alert('ロール変更に失敗しました。')
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">ログインが必要です</div>
      </div>
    )
  }

  if (session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">管理者権限が必要です</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">全てのユーザー</h1>
              <p className="text-gray-600 mt-1">全ユーザーの一覧と詳細情報</p>
            </div>
            <Link
              href="/admin"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              管理画面に戻る
            </Link>
          </div>
        </div>

        {/* フィルター */}
        <div className="mb-8 bg-white shadow-sm rounded-lg">
          <div className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* 検索とロールフィルター */}
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="ユーザー名、メールアドレスで検索"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">すべてのロール</option>
                    <option value="ADMIN">管理者</option>
                    <option value="USER">一般ユーザー</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">すべての期間</option>
                    <option value="today">今日</option>
                    <option value="week">過去1週間</option>
                    <option value="month">過去1ヶ月</option>
                    <option value="year">過去1年</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  検索
                </button>
              </div>
              
              {/* フィルターリセット */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      search: '',
                      role: '',
                      dateRange: '',
                      sortBy: 'createdAt',
                      sortOrder: 'desc'
                    })
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  フィルターをリセット
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ユーザー一覧テーブル */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    名前 {filters.sortBy === 'name' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('email')}
                  >
                    メール {filters.sortBy === 'email' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('role')}
                  >
                    ロール {filters.sortBy === 'role' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    登録日時 {filters.sortBy === 'createdAt' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('updatedAt')}
                  >
                    最終更新 {filters.sortBy === 'updatedAt' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalSurveys')}
                  >
                    作成数 {filters.sortBy === 'totalSurveys' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('activeSurveys')}
                  >
                    公開数 {filters.sortBy === 'activeSurveys' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('publishRate')}
                  >
                    公開率 {filters.sortBy === 'publishRate' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalResponses')}
                  >
                    合計回答数 {filters.sortBy === 'totalResponses' && (filters.sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                      ユーザーが見つかりません
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.name || '未設定'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'ADMIN' ? '管理者' : '一般ユーザー'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.updatedAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {user.totalSurveys}件
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {user.activeSurveys}件
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.publishRate >= 50 ? 'bg-green-100 text-green-800' :
                          user.publishRate >= 25 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.publishRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {user.totalResponses}件
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            詳細
                          </Link>
                          <button
                            onClick={() => openRoleChangeModal(user)}
                            className="text-orange-600 hover:text-orange-800 text-xs"
                          >
                            ロール変更
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  {pagination.total} 件中 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 件を表示
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    前へ
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    次へ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ロール変更モーダル */}
      {roleChangeModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ロール変更の確認
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                ユーザー: <span className="font-medium">{roleChangeModal.user?.name || roleChangeModal.user?.email}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                現在のロール: <span className="font-medium">
                  {roleChangeModal.user?.role === 'ADMIN' ? '管理者' : '一般ユーザー'}
                </span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                新しいロール: <span className="font-medium">
                  {roleChangeModal.newRole === 'ADMIN' ? '管理者' : '一般ユーザー'}
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理者パスワード
              </label>
              <input
                type="password"
                value={roleChangeModal.password}
                onChange={(e) => setRoleChangeModal(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを入力"
              />
            </div>

            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={roleChangeModal.confirmChecked}
                  onChange={(e) => setRoleChangeModal(prev => ({ ...prev, confirmChecked: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  この操作を実行してもよろしいですか？ロール変更は取り消せません。
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeRoleChangeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={handleRoleChange}
                disabled={!roleChangeModal.password || !roleChangeModal.confirmChecked}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ロール変更を実行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
