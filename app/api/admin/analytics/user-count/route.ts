import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('User count API called')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Session found:', session.user.email)

    // 管理者権限のチェック
    if (session.user.role !== 'ADMIN') {
      console.log('Not admin user:', session.user.email, 'Role:', session.user.role)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    console.log('Period requested:', period)
    
    // デバッグ用：データベースの基本情報を取得
    let totalUserCount = 0
    let totalSessionCount = 0
    try {
      console.log('Checking database connection...')
      const { count: userCount, error: userError } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
      
      totalUserCount = userCount || 0
      
      // Session テーブルは廃止されたため、0を返す
      totalSessionCount = 0
      
      console.log(`Total users in database: ${totalUserCount}`)
      console.log(`Total sessions in database: ${totalSessionCount}`)
      
      if (userError) {
        console.error('Error fetching user count:', userError)
        return NextResponse.json({ error: 'Failed to fetch user count' }, { status: 500 })
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      }, { status: 500 })
    }

    // 期間に応じて日数を計算
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    console.log('Start date:', startDate.toISOString())

    // 期間開始時点の総ユーザー数を取得
    let totalUsersAtStart = 0
    try {
      const { count: usersAtStart, error: startCountError } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
        .lt('createdAt', startDate.toISOString())
      
      totalUsersAtStart = usersAtStart || 0
      
      if (startCountError) {
        console.error('Error getting users at start:', startCountError)
      }
      console.log('Total users at start:', totalUsersAtStart)
    } catch (error) {
      console.error('Error getting total users at start:', error)
    }

    // 日別の新規ユーザー数を取得（登録日時ベース）
    let newUsers: any[] = []
    try {
      // Raw SQLクエリはSupabaseでは複雑なため、簡易版に変更
      const { data: newUserData, error: newUserError } = await supabase
        .from('User')
        .select('createdAt')
        .gte('createdAt', startDate.toISOString())
        .order('createdAt', { ascending: true })
      
      if (newUserError) {
        console.error('Error fetching new users:', newUserError)
        newUsers = []
      } else {
        // 日付別にグループ化
        const usersByDate = newUserData?.reduce((acc, user) => {
          const date = new Date(user.createdAt).toISOString().split('T')[0]
          acc[date] = (acc[date] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}
        
        newUsers = Object.entries(usersByDate).map(([date, count]) => ({
          date,
          new_users: count
        }))
      }
      console.log('New users data:', newUsers)
    } catch (error) {
      console.error('Error getting new users:', error)
    }

    // アクティブユーザー（公開中〜回答終了のアンケートを保持しているユーザー）を取得
    // 各日付時点でアクティブなユーザー数を計算
    let activeUsersData = []
    try {
      // まず、アクティブなユーザーのリストを取得
      let { data: activeUserIds, error: activeUsersError } = await supabase
        .from('User')
        .select(`
          id, createdAt,
          surveys:Survey!inner(status)
        `)
        .in('surveys.status', ['ACTIVE', 'CLOSED'])

      if (activeUsersError) {
        console.error('Error fetching active users:', activeUsersError)
        // エラーでも処理を続行（空配列として扱う）
        activeUserIds = []
      }

      // 重複ユーザーを除去（複数のアクティブアンケートを持つユーザー対応）
      const uniqueActiveUsers = activeUserIds?.reduce((acc: any[], user: any) => {
        if (!acc.find(u => u.id === user.id)) {
          acc.push({ id: user.id, createdAt: user.createdAt })
        }
        return acc
      }, []) || []
      console.log('Active user IDs:', uniqueActiveUsers.length)

      // 日付別にアクティブユーザー数を計算
      for (let i = 0; i < days; i++) {
        const currentDate = new Date()
        currentDate.setDate(currentDate.getDate() - (days - 1 - i))
        currentDate.setHours(23, 59, 59, 999) // その日の終了時刻
        
        const activeCount = uniqueActiveUsers.filter(user => new Date(user.createdAt) <= currentDate).length
        activeUsersData.push({
          date: currentDate.toISOString().split('T')[0],
          active_users: activeCount
        })
      }
      console.log('Active users data:', activeUsersData)
    } catch (error) {
      console.error('Error getting active users:', error)
    }

    // 日付マップを作成
    const dateMap = new Map<string, {
      date: string
      totalUsers: number
      newUsers: number
      activeUsers: number
    }>()

    // 全期間の日付を生成
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      const dateStr = date.toISOString().split('T')[0]
      
      dateMap.set(dateStr, {
        date: dateStr,
        totalUsers: 0,
        newUsers: 0,
        activeUsers: 0
      })
    }

    // 新規ユーザー数を設定
    newUsers.forEach(item => {
      const dateStr = item.date // dateは既に文字列形式
      const existing = dateMap.get(dateStr)
      if (existing) {
        existing.newUsers = Number(item.new_users)
      }
    })

    // アクティブユーザー数を設定
    activeUsersData.forEach(item => {
      const existing = dateMap.get(item.date)
      if (existing) {
        existing.activeUsers = item.active_users
      }
    })

    // 累積ユーザー数を計算
    let cumulativeUsers = totalUsersAtStart
    const result = Array.from(dateMap.values()).map(item => {
      cumulativeUsers += item.newUsers
      return {
        ...item,
        totalUsers: cumulativeUsers
      }
    })

    // データが空の場合は最低限のデータを返す
    if (result.length === 0 || result.every(item => item.totalUsers === 0 && item.newUsers === 0 && item.activeUsers === 0)) {
      console.log('No data found, creating sample data')
      const today = new Date().toISOString().split('T')[0]
      result.push({
        date: today,
        totalUsers: totalUsersAtStart || totalUserCount,
        newUsers: 0,
        activeUsers: 0
      })
    }

    // デバッグ情報を追加
    const debugInfo = {
      period,
      totalDays: days,
      startDate: startDate.toISOString(),
      totalUsersAtStart,
      totalUsersAtEnd: result[result.length - 1]?.totalUsers || 0,
      newUsersInPeriod: result.reduce((sum, item) => sum + item.newUsers, 0),
      dataPoints: result.length
    }

    console.log('User count API debug info:', debugInfo)
    console.log('Result data:', result)

    return NextResponse.json({
      data: result,
      debug: debugInfo
    })

  } catch (error) {
    console.error('Error fetching user count data:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
