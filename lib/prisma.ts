import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  // Vercelサーバーレス環境用の最適化設定
  const databaseUrl = process.env.DATABASE_URL + '?connect_timeout=60&pool_timeout=60&socket_timeout=60'
  
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
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: ['query', 'error']
    })
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
