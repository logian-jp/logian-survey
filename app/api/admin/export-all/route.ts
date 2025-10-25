import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { recordDataUsage } from '@/lib/plan-limits'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'raw' // raw, normalized, standardized
    const includePersonalData = searchParams.get('includePersonalData') === 'true'
    
    // 全アンケートと回答データを取得
    const { data: surveys, error: surveysError } = await supabase
      .from('Survey')
      .select(`
        *,
        user:User!userId(name, email),
        questions:Question(*),
        responses:Response(*, answers:Answer(*))
      `)

    if (surveysError) {
      console.error('Error fetching surveys:', surveysError)
      return NextResponse.json({ message: 'Failed to fetch surveys' }, { status: 500 })
    }

    // 質問を手動でソート
    surveys?.forEach(survey => {
      if (survey.questions) {
        survey.questions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      }
    })
    
    // CSVデータを生成
    const csvData = generateAllSurveysCSV(surveys, format, includePersonalData)
    
    // データ使用量を記録（エクスポート時）
    const exportDataSize = csvData.length
    await recordDataUsage('admin', null, 'export_data', exportDataSize, `全データエクスポート（${format}形式）`)
    
    // ファイル名を生成
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `all_surveys_${format}_${timestamp}.csv`
    const encodedFilename = encodeURIComponent(filename)
    
    // UTF-8 BOMを追加
    const csvWithBOM = '\uFEFF' + csvData
    
    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (error) {
    console.error('Failed to export all surveys:', error)
    return NextResponse.json(
      { message: 'Failed to export all surveys data' },
      { status: 500 }
    )
  }
}

function generateAllSurveysCSV(surveys: any[], format: string, includePersonalData: boolean): string {
  const headers = [
    'アンケートID',
    'アンケートタイトル',
    'アンケート作成者',
    '作成者メール',
    'アンケートステータス',
    'アンケート作成日時',
    '回答ID',
    '回答日時',
    '質問ID',
    '質問タイトル',
    '質問タイプ',
    '回答値'
  ]
  
  const rows: string[] = []
  rows.push(headers.join(','))
  
  surveys.forEach(survey => {
    survey.responses.forEach((response: any) => {
      response.answers.forEach((answer: any) => {
        const question = survey.questions.find((q: any) => q.id === answer.questionId)
        
        if (!question) return
        
        // 個人情報の除外チェック
        if (!includePersonalData && ['NAME', 'EMAIL', 'PHONE'].includes(question.type)) {
          return
        }
        
        const rowData = [
          escapeCSVValue(survey.id),
          escapeCSVValue(survey.title),
          escapeCSVValue(survey.user.name || ''),
          escapeCSVValue(survey.user.email),
          escapeCSVValue(survey.status),
          escapeCSVValue(formatToTokyoTime(survey.createdAt)),
          escapeCSVValue(response.id),
          escapeCSVValue(formatToTokyoTime(response.createdAt)),
          escapeCSVValue(question.id),
          escapeCSVValue(question.title),
          escapeCSVValue(question.type),
          escapeCSVValue(answer.value || '')
        ]
        
        rows.push(rowData.join(','))
      })
    })
  })
  
  return rows.join('\n')
}

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatToTokyoTime(dateString: string): string {
  const date = new Date(dateString)
  const tokyoTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return tokyoTime.toISOString().replace('T', ' ').slice(0, 16)
}
