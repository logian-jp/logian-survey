// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:cPNyaj92Vk2S0MCi@db.xoovzxmgmqtdtwgxwgcp.supabase.co:5432/postgres"
    }
  }
})

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Connection successful!', result)
  } catch (error) {
    console.error('Connection failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
