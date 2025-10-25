import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function isAdmin(): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.role) {
      return false
    }
    
    return session.user.role === 'ADMIN'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

export async function requireAdmin() {
  try {
    const isAdminUser = await isAdmin()
    
    if (!isAdminUser) {
      throw new Error('Admin access required')
    }
    
    return true
  } catch (error) {
    console.error('Error in requireAdmin:', error)
    throw new Error('Admin access required')
  }
}
