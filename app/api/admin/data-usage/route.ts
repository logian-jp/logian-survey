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
    const session = await getServerSession(authOptions)
    
    console.log('Data usage API called by user:', session?.user?.email, 'role:', session?.user?.role)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 全ユーザーのデータ使用量を取得
    const { data: dataUsage, error: dataUsageError } = await supabase
      .from('DataUsage')
      .select(`
        *,
        user:User!userId(id, name, email)
      `)
      .order('createdAt', { ascending: false })

    if (dataUsageError) {
      console.error('Error fetching data usage:', dataUsageError)
      return NextResponse.json({ message: 'Failed to fetch data usage' }, { status: 500 })
    }

    console.log('Found data usage records:', dataUsage?.length || 0)

    // データタイプ別に集計
    const systemData = dataUsage.filter(usage => 
      usage.dataType === 'export_data' || 
      usage.dataType === 'file_upload'
    )
    
    const surveyData = dataUsage.filter(usage => 
      usage.dataType === 'survey_data'
    )

    // 合計サイズを計算
    const totalSystemSize = systemData.reduce((sum, usage) => sum + usage.sizeBytes, 0)
    const totalSurveySize = surveyData.reduce((sum, usage) => sum + usage.sizeBytes, 0)
    const totalSize = totalSystemSize + totalSurveySize

    // ユーザー別の集計
    const userUsage = dataUsage.reduce((acc, usage) => {
      const userId = usage.userId
      if (!acc[userId]) {
        acc[userId] = {
          user: usage.user,
          systemSize: 0,
          surveySize: 0,
          totalSize: 0
        }
      }
      
      if (usage.dataType === 'survey_data') {
        acc[userId].surveySize += usage.sizeBytes
      } else {
        acc[userId].systemSize += usage.sizeBytes
      }
      acc[userId].totalSize += usage.sizeBytes
      
      return acc
    }, {} as Record<string, any>)

    const userUsageArray = Object.values(userUsage).sort((a: any, b: any) => b.totalSize - a.totalSize)

    return NextResponse.json({
      totalUsage: {
        systemSize: totalSystemSize,
        surveySize: totalSurveySize,
        totalSize: totalSize
      },
      userUsage: userUsageArray,
      recentUsage: dataUsage.slice(0, 50) // 最近の50件
    })

  } catch (error) {
    console.error('Error fetching data usage:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
