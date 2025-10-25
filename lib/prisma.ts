import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  // Vercelサーバーレス環境用の最適化設定
  // SSL設定とConnection Pooling設定を含める
  const baseUrl = process.env.DATABASE_URL || ''
  const hasParams = baseUrl.includes('?')
  const sslParam = hasParams ? '&sslmode=require' : '?sslmode=require'
  
  // Supabase Connection Poolingの最適化設定
  const connectionParams = [
    'sslmode=require',
    'pgbouncer=true',           // PgBouncer接続プーリング有効化
    'connection_limit=1',       // サーバーレス環境では1接続に制限
    'pool_timeout=20',          // プールタイムアウト短縮
    'connect_timeout=10',       // 接続タイムアウト短縮
    'pool_mode=transaction',    // トランザクションレベルでプーリング
    'statement_cache_size=0'    // ステートメントキャッシュ無効化
  ].join('&')
  
  const databaseUrl = hasParams 
    ? baseUrl + '&' + connectionParams
    : baseUrl + '?' + connectionParams
  
  console.log('Production DB URL configured with connection pooling')
  
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: process.env.DEBUG === 'true' ? ['query', 'error'] : ['error'],
    errorFormat: 'minimal'
  })
} else {
  if (!globalForPrisma.prisma) {
    // 開発環境でもConnection Poolingを最適化
    const baseUrl = process.env.DATABASE_URL || ''
    const hasParams = baseUrl.includes('?')
    
    // 開発環境用の接続プール設定（本番より緩やか）
    const connectionParams = [
      'sslmode=require',
      'pgbouncer=true',           
      'connection_limit=5',       // 開発環境では5接続まで許可
      'pool_timeout=30',          // より長いタイムアウト
      'connect_timeout=15',       
      'pool_mode=session'         // セッションレベルでプーリング
    ].join('&')
    
    const developmentUrl = hasParams 
      ? baseUrl + '&' + connectionParams
      : baseUrl + '?' + connectionParams
    
    console.log('Development DB URL configured with connection pooling')
    
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: developmentUrl
        }
      },
      log: ['query', 'error']
    })
  }
  prisma = globalForPrisma.prisma
}

// プロセス終了時の適切なクリーンアップ
if (typeof window === 'undefined') {
  // サーバーサイドでのみ実行
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
  
  process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

export { prisma }
