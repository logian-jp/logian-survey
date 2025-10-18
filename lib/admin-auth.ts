import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// 管理者のメールアドレス一覧
const ADMIN_EMAILS = [
  'admin@logian.jp',
  'takashi@logian.jp',
  'noutomi0729@gmail.com',
  // 必要に応じて追加
]

export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return false
    }
    
    return ADMIN_EMAILS.includes(session.user.email)
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

export async function requireAdmin() {
  const isAdminUser = await isAdmin()
  
  if (!isAdminUser) {
    throw new Error('Admin access required')
  }
  
  return true
}
