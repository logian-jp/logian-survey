'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface InvitationInfo {
  id: string
  inviterName: string
  inviterEmail: string
  message?: string
  invitedEmail?: string
  invitedName?: string
}

export default function InviteSignupPage() {
  const params = useParams()
  const router = useRouter()
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (params.code) {
      validateInvitation(params.code as string)
    }
  }, [params.code])

  const validateInvitation = async (code: string) => {
    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/invitations/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      if (response.ok) {
        const data = await response.json()
        setInvitationInfo(data.invitation)
        
        // 招待時に指定されたメールアドレスがある場合は自動入力
        if (data.invitation.invitedEmail) {
          setFormData(prev => ({
            ...prev,
            email: data.invitation.invitedEmail
          }))
        }
        if (data.invitation.invitedName) {
          setFormData(prev => ({
            ...prev,
            name: data.invitation.invitedName
          }))
        }
      } else {
        const errorData = await response.json()
        setError(errorData.message || '招待コードが無効です')
      }
    } catch (error) {
      console.error('Failed to validate invitation:', error)
      setError('招待コードの検証に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません')
      setIsSubmitting(false)
      return
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      setIsSubmitting(false)
      return
    }

    try {
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/invitations/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: params.code,
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      })

      if (response.ok) {
        setSuccess(true)
        // 3秒後にログインページにリダイレクト
        setTimeout(() => {
          router.push('/auth/signin?message=アカウントが作成されました。ログインしてください。')
        }, 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'アカウント作成に失敗しました')
      }
    } catch (error) {
      console.error('Failed to create account:', error)
      setError('アカウント作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">招待コードを検証中...</div>
      </div>
    )
  }

  if (error && !invitationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-lg mb-4">
            ✅ アカウントが作成されました！
          </div>
          <div className="text-gray-600 mb-4">
            ログインページにリダイレクトします...
          </div>
          <Link
            href="/auth/signin"
            className="text-blue-600 hover:text-blue-800"
          >
            今すぐログインする
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            招待制アカウント作成
          </h1>
          <p className="text-gray-600">
            {invitationInfo?.inviterName}さんからの招待です
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* 招待者情報 */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">招待者: {invitationInfo?.inviterName}</div>
              <div className="text-blue-600">{invitationInfo?.inviterEmail}</div>
              {invitationInfo?.message && (
                <div className="mt-2 text-sm">
                  <div className="font-medium">メッセージ:</div>
                  <div className="mt-1">{invitationInfo.message}</div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                お名前
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="お名前を入力してください"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="メールアドレスを入力してください"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="パスワードを入力してください（6文字以上）"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="パスワードを再入力してください"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'アカウント作成中...' : 'アカウントを作成'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              既にアカウントをお持ちの方はこちら
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
