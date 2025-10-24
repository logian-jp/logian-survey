'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError('認証に失敗しました')
          return
        }

        if (data.session) {
          // ユーザー情報をデータベースに同期
          await syncUserToDatabase(data.session.user)
          router.push('/dashboard')
        } else {
          setError('セッションが見つかりません')
        }
      } catch (error) {
        console.error('Auth callback exception:', error)
        setError('認証処理中にエラーが発生しました')
      } finally {
        setIsLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  const syncUserToDatabase = async (user: any) => {
    try {
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        }),
      })

      if (!response.ok) {
        console.error('Failed to sync user to database')
      }
    } catch (error) {
      console.error('Error syncing user:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">認証中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">認証エラー</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            ログインページに戻る
          </button>
        </div>
      </div>
    )
  }

  return null
}
