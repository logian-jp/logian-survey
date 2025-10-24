'use client'

import { useState } from 'react'

interface StripePortalProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function StripePortal({ onSuccess, onError }: StripePortalProps) {
  const [loading, setLoading] = useState(false)

  const handlePortal = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/settings`,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Portal error:', error)
      onError?.(error instanceof Error ? error.message : 'ポータルへのアクセスでエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePortal}
      disabled={loading}
      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
    >
      {loading ? '処理中...' : 'サブスクリプション管理'}
    </button>
  )
}
