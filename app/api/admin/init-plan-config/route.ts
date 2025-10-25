import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (session.user.email !== 'noutomi0729@gmail.com') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    console.log('Initializing plan configuration on Vercel...')
    
    // 既存のプラン設定をクリア
    await prisma.planConfig.deleteMany({})
    console.log('Cleared existing plan configurations')
    
    // プラン設定を作成
    const planConfigs = [
      {
        planType: 'FREE',
        name: '基本プラン',
        price: 0,
        features: ['基本機能', 'CSV出力（raw）'],
        limits: {
          maxSurveys: 3,
          maxResponsesPerSurvey: 100,
          exportFormats: ['raw']
        },
        isActive: true
      },
      {
        planType: 'STANDARD',
        name: 'スタンダードプラン',
        price: 2980,
        features: ['基本機能', 'CSV出力（raw, normalized）', '高度な分析'],
        limits: {
          maxSurveys: 10,
          maxResponsesPerSurvey: 1000,
          exportFormats: ['raw', 'normalized']
        },
        isActive: true
      },
      {
        planType: 'PROFESSIONAL',
        name: 'プロフェッショナルプラン',
        price: 9800,
        features: ['全機能', 'CSV出力（全形式）', 'API連携', '優先サポート'],
        limits: {
          maxSurveys: 50,
          maxResponsesPerSurvey: 5000,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true
      },
      {
        planType: 'ENTERPRISE',
        name: 'エンタープライズプラン',
        price: 29800,
        features: ['無制限', '全機能', '専用サポート', 'カスタム機能'],
        limits: {
          maxSurveys: -1,
          maxResponsesPerSurvey: -1,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true
      },
      {
        planType: 'ONETIME_UNLIMITED',
        name: '単発無制限プラン',
        price: 10000,
        features: ['単発アンケート無制限', '全機能', '1回限り'],
        limits: {
          maxSurveys: -1,
          maxResponsesPerSurvey: -1,
          exportFormats: ['raw', 'normalized', 'standardized']
        },
        isActive: true
      }
    ]
    
    for (const config of planConfigs) {
      await prisma.planConfig.create({
        data: config
      })
      console.log(`Created plan config: ${config.name} (${config.planType}) - ¥${config.price}`)
    }
    
    console.log('Plan configuration initialization completed!')
    
    // 確認
    const createdConfigs = await prisma.planConfig.findMany()
    console.log(`Total plan configs created: ${createdConfigs.length}`)
    
    return NextResponse.json({
      success: true,
      message: 'Plan configuration initialized successfully',
      count: createdConfigs.length
    })
    
  } catch (error) {
    console.error('Error initializing plan config:', error)
    return NextResponse.json(
      { message: 'Failed to initialize plan configuration' },
      { status: 500 }
    )
  }
}
