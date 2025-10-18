import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // 開発環境でもadapterを使用しない（JWT戦略を使用）
  // ...(process.env.NODE_ENV === 'production' ? { adapter: PrismaAdapter(prisma) } : {}),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          return null
        }

        try {
          console.log('Starting authentication for:', credentials.email)
          console.log('DATABASE_URL:', process.env.DATABASE_URL)
          
          // Prismaクライアントが利用可能かチェック
          if (!prisma) {
            console.error('Prisma client not available')
            return null
          }

          console.log('Prisma client available, querying user...')
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          console.log('User found:', user ? 'Yes' : 'No')
          if (!user || !user.password) {
            console.log('User not found or no password')
            return null
          }

          console.log('Checking password...')
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          console.log('Password valid:', isPasswordValid)
          if (!isPasswordValid) {
            return null
          }

          console.log('Authentication successful')
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}
