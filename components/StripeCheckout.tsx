'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface StripeCheckoutProps {
  planType: string
  planName: string
  price: number
  surveyId?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export default function StripeCheckout({ 
  planType, 
  planName, 
  price, 
  surveyId,
  onSuccess, 
  onError 
}: StripeCheckoutProps) {
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          successUrl: `${window.location.origin}/plans?success=true`,
          cancelUrl: `${window.location.origin}/plans?canceled=true`,
          surveyId: surveyId || undefined,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (!url) {
        throw new Error('Checkout URL not returned')
      }

      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      onError?.(error instanceof Error ? error.message : '決済処理でエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
    >
      {loading ? '処理中...' : `${planName}を購入する (¥${price.toLocaleString()})`}
    </button>
  )
}
