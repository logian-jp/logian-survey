import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
          console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
          
          console.log('Querying user with Supabase SDK...')
          const { data: user, error } = await supabase
            .from('User')
            .select('*')
            .eq('email', credentials.email)
            .single()

          if (error) {
            console.error('Supabase query error:', error)
            return null
          }

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
          const { data: existingUser, error: findError } = await supabase
            .from('User')
            .select('*')
            .eq('email', profile.email)
            .single()
          
          if (findError && findError.code !== 'PGRST116') {
            // PGRST116は"row not found"エラー（新規ユーザー）
            console.error('Error finding Google user:', findError)
            return false
          }
          
          if (!existingUser) {
            // 新規ユーザーを作成
            const { error: createError } = await supabase
              .from('User')
              .insert({
                id: user.id,
                email: profile.email,
                name: profile.name || '',
                role: 'USER',
                emailVerified: new Date().toISOString(),
              })
            
            if (createError) {
              console.error('Error creating Google user:', createError)
              return false
            }
            console.log('Created new Google user:', profile.email)
          } else {
            // 既存ユーザーの情報を更新
            const { error: updateError } = await supabase
              .from('User')
              .update({
                name: profile.name || existingUser.name,
                emailVerified: new Date().toISOString(),
              })
              .eq('email', profile.email)
            
            if (updateError) {
              console.error('Error updating Google user:', updateError)
              return false
            }
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
          console.log('NODE_ENV:', process.env.NODE_ENV) // Added debug log
          console.log('Prisma instance:', prisma ? 'exists' : 'null') // Added debug log
          
          let dbUser = null
          let error = null
          
          // IDで検索を試す
          if (token.sub) {
            const { data, error: idError } = await supabase
              .from('User')
              .select('id, role, email')
              .eq('id', token.sub)
              .single()
            
            if (data && !idError) {
              dbUser = data
            } else if (idError && idError.code !== 'PGRST116') {
              error = idError
            }
          }
          
          // IDで見つからない場合、メールで検索
          if (!dbUser && token.email) {
            const { data, error: emailError } = await supabase
              .from('User')
              .select('id, role, email')
              .eq('email', token.email)
              .single()
            
            if (data && !emailError) {
              dbUser = data
            } else if (emailError && emailError.code !== 'PGRST116') {
              error = emailError
            }
          }
          
          if (error) {
            console.error('JWT: Error fetching user:', error)
          }
          
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
