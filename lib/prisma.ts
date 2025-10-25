import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  // Vercelサーバーレス環境用の最適化設定
  // SSL設定を含める
  const baseUrl = process.env.DATABASE_URL || ''
  const hasParams = baseUrl.includes('?')
  const sslParam = hasParams ? '&sslmode=require' : '?sslmode=require'
  const databaseUrl = baseUrl + sslParam + '&connect_timeout=60&pool_timeout=60&socket_timeout=60'
  
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: ['error'],
    errorFormat: 'minimal'
  })
} else {
  if (!globalForPrisma.prisma) {
    // 開発環境でもSSL設定を確実に含める
    const baseUrl = process.env.DATABASE_URL || ''
    const hasParams = baseUrl.includes('?')
    const developmentUrl = baseUrl.includes('sslmode=require') 
      ? baseUrl 
      : baseUrl + (hasParams ? '&sslmode=require' : '?sslmode=require')
    
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

export { prisma }
