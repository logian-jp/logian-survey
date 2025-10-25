import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // CredentialsProviderを使用するためJWTストラテジーのみ使用
  // PrismaAdapterは使わずJWTで認証を管理
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
    async signIn({ user, account, profile }) {
      // Googleプロバイダーの場合、データベースにユーザーを保存/更新
      if (account?.provider === 'google' && profile?.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email }
          })
          
          if (!existingUser) {
            // 新規ユーザーを作成
            await prisma.user.create({
              data: {
                id: user.id,
                email: profile.email,
                name: profile.name || '',
                role: 'USER',
                emailVerified: new Date(),
              }
            })
            console.log('Created new Google user:', profile.email)
          } else {
            // 既存ユーザーの情報を更新
            await prisma.user.update({
              where: { email: profile.email },
              data: {
                name: profile.name || existingUser.name,
                emailVerified: new Date(),
              }
            })
            console.log('Updated existing Google user:', profile.email)
          }
        } catch (error) {
          console.error('Error managing Google user:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      console.log('JWT callback:', { 
        token: token ? 'exists' : 'null', 
        user: user ? 'exists' : 'null',
        account: account?.provider || 'none'
      })
      
      if (user) {
        // 初回ログイン時
        token.role = user.role
        console.log('JWT: Added role to token:', user.role)
      } else if (token?.email || token?.sub) {
        // 既存のトークンからユーザー情報を取得
        try {
          const dbUser = await prisma.user.findFirst({
            where: {
              OR: [
                { id: token.sub || '' },
                { email: token.email || '' }
              ]
            },
            select: { id: true, role: true, email: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.sub = dbUser.id
            console.log('JWT: Updated user info from database:', { 
              id: dbUser.id, 
              role: dbUser.role,
              email: dbUser.email 
            })
          }
        } catch (error) {
          console.error('JWT: Error fetching user role:', error)
          // エラーが発生してもトークンは返す（認証を続行）
        }
      }
      return token
    },
    async session({ session, token }) {
      console.log('Session callback:', { session: session ? 'exists' : 'null', token: token ? 'exists' : 'null' })
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        console.log('Session: Added user data to session:', { id: session.user.id, role: session.user.role })
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  // JWT設定
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}
