import Stripe from 'stripe'

// Stripe初期化（ビルド時エラー回避のため条件付き）
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    })
  : null

// Stripeインスタンスを安全に取得
export const getStripe = () => {
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return stripe
}

export const getStripePublishableKey = () => {
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    throw new Error('STRIPE_PUBLISHABLE_KEY is not set')
  }
  return process.env.STRIPE_PUBLISHABLE_KEY
}

// プランタイプからStripe Price IDを取得
export const getStripePriceId = (planType: string): string | null => {
  const priceIdMap: Record<string, string> = {
    'STANDARD': process.env.STRIPE_PRICE_ID_STANDARD || '',
    'PROFESSIONAL': process.env.STRIPE_PRICE_ID_PROFESSIONAL || '',
    'ENTERPRISE': process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
    'ONETIME_UNLIMITED': process.env.STRIPE_PRICE_ID_ONETIME || '',
  }
  
  return priceIdMap[planType] || null
}

// Stripe Customer IDを取得または作成
export const getOrCreateStripeCustomer = async (userId: string, email: string) => {
  try {
    const stripeInstance = getStripe()
    
    // 既存のCustomerを検索
    const customers = await stripeInstance.customers.list({
      email: email,
      limit: 1
    })
    
    if (customers.data.length > 0) {
      return customers.data[0]
    }
    
    // 新しいCustomerを作成
    const customer = await stripeInstance.customers.create({
      email: email,
      metadata: {
        userId: userId
      }
    })
    
    return customer
  } catch (error) {
    console.error('Error creating/finding Stripe customer:', error)
    throw error
  }
}
