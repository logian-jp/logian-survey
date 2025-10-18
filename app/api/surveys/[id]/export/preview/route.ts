import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { convertAgeGroupToNumber, PREFECTURE_REGIONS } from '@/lib/survey-parts'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const surveyId = params.id
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'raw'
    const includePersonalData = searchParams.get('includePersonalData') === 'true'

    // アンケートの所有者を確認
    const survey = await prisma.survey.findFirst({
      where: {
        id: surveyId,
        userId: session.user.id,
      },
      include: {
        questions: {
          orderBy: {
            order: 'asc',
          },
        },
        responses: {
          include: {
            answers: true,
          },
          take: 5, // プレビュー用に5件のみ取得
        },
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // CSVデータを生成（プレビュー用）
    const csvData = generateCSVData(survey, format, includePersonalData)

    return NextResponse.json({
      preview: csvData,
      totalResponses: survey.responses.length,
      previewCount: Math.min(5, survey.responses.length)
    })
  } catch (error) {
    console.error('Failed to generate CSV preview:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateCSVData(survey: any, format: string, includePersonalData: boolean) {
  const questions = survey.questions
  const responses = survey.responses

  // ヘッダー行を生成
  const headers: string[] = ['回答ID', '回答日時']
  const questionMap: { [key: string]: any } = {}

    questions.forEach((question: any) => {
      const parsedSettings = question.settings ? JSON.parse(question.settings) : {}
      
      // 個人情報の除外チェック
      if (!includePersonalData && ['NAME', 'EMAIL', 'PHONE'].includes(question.type)) {
        return
      }

      if (format === 'raw') {
        headers.push(question.title)
        questionMap[question.id] = { question, settings: parsedSettings }
      } else {
        // 分析用の列を生成
        if (question.type === 'AGE_GROUP') {
          // 年齢グループは順序構造があるカテゴリ変数として1列で表示
          headers.push(`${question.title}_numeric`)
        } else if (['RADIO', 'SELECT', 'PREFECTURE'].includes(question.type)) {
          if (parsedSettings.ordinalStructure) {
            // 順序構造がある場合、数値変換（1列）
            headers.push(`${question.title}_numeric`)
          } else {
            // 順序構造がない場合、One-Hot Encoding
            const options = getQuestionOptions(question)
            options.forEach(option => {
              headers.push(`${question.title}_${option}`)
            })
          }
        } else if (question.type === 'CHECKBOX') {
          if (parsedSettings.ordinalStructure) {
            // 順序構造がある複数選択の場合、数値変換（1列）
            headers.push(`${question.title}_numeric`)
          } else {
            // 順序構造がない複数選択の場合、One-Hot Encoding
            const options = getQuestionOptions(question)
            options.forEach(option => {
              headers.push(`${question.title}_${option}`)
            })
          }
        } else {
          headers.push(question.title)
        }
        questionMap[question.id] = { question, settings: parsedSettings }
      }
    })

  // データ行を生成
  const rows: string[] = []
  rows.push(headers.join(','))

  responses.forEach((response: any) => {
    const rowData: string[] = [
      response.id,
      formatToTokyoTime(response.createdAt)
    ]
    const answerMap: { [key: string]: string } = {}
    
    // 回答をマップに変換
    response.answers.forEach((answer: any) => {
      answerMap[answer.questionId] = answer.value
    })

    questions.forEach((question: any) => {
      const parsedSettings = question.settings ? JSON.parse(question.settings) : {}
      
      // 個人情報の除外チェック
      if (!includePersonalData && ['NAME', 'EMAIL', 'PHONE'].includes(question.type)) {
        return
      }

      const answer = answerMap[question.id] || ''

      if (format === 'raw') {
        rowData.push(escapeCSVValue(answer))
      } else {
        // 分析用のデータ変換
        if (question.type === 'AGE_GROUP') {
          // 年齢グループは順序構造があるカテゴリ変数として1列で表示
          const numericValue = convertToNumeric(question, answer)
          const processedValue = processNumericValue(numericValue, format, question, responses)
          const displayValue = (numericValue === 0 || isNaN(processedValue)) ? 'NA' : String(processedValue)
          rowData.push(escapeCSVValue(displayValue))
        } else if (['RADIO', 'SELECT', 'PREFECTURE'].includes(question.type)) {
          if (parsedSettings.ordinalStructure) {
            // 順序構造がある場合、数値変換
            const numericValue = convertToNumeric(question, answer)
            const processedValue = processNumericValue(numericValue, format, question, responses)
            const displayValue = (numericValue === 0 || isNaN(processedValue)) ? 'NA' : String(processedValue)
            rowData.push(escapeCSVValue(displayValue))
          } else {
            // 順序構造がない場合、One-Hot Encoding
            const options = getQuestionOptions(question)
            options.forEach(option => {
              const isSelected = answer === option ? '1' : '0'
              rowData.push(escapeCSVValue(isSelected))
            })
          }
        } else if (question.type === 'CHECKBOX') {
          if (parsedSettings.ordinalStructure) {
            // 順序構造がある複数選択の場合、数値変換（1列）
            const numericValue = convertToNumeric(question, answer)
            const processedValue = processNumericValue(numericValue, format, question, responses)
            const displayValue = (numericValue === 0 || isNaN(processedValue)) ? 'NA' : String(processedValue)
            rowData.push(escapeCSVValue(displayValue))
          } else {
            // 順序構造がない複数選択の場合、One-Hot Encoding
            const options = getQuestionOptions(question)
            const selectedOptions = answer ? answer.split(',') : []
            console.log('CHECKBOX processing (preview):', {
              questionId: question.id,
              questionTitle: question.title,
              answer: answer,
              selectedOptions: selectedOptions,
              options: options
            })
            options.forEach(option => {
              const isSelected = selectedOptions.includes(option) ? '1' : '0'
              console.log(`Option "${option}": isSelected=${isSelected}`)
              rowData.push(escapeCSVValue(isSelected))
            })
          }
        } else {
          // その他の場合、そのまま
          rowData.push(escapeCSVValue(answer))
        }
      }
    })

    rows.push(rowData.join(','))
  })

  return rows.join('\n')
}

function getQuestionOptions(question: any): string[] {
  if (question.options) {
    return JSON.parse(question.options)
  }
  
  if (question.type === 'PREFECTURE') {
    return ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
            '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
            '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
            '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
            '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
            '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
            '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
  }
  
  if (question.type === 'AGE_GROUP') {
    return ['10代', '20代', '30代', '40代', '50代', '60代', '70代以上']
  }
  
  return []
}

function convertToNumeric(question: any, answer: string): number {
  console.log(`Converting to numeric (preview): ${question.type} - "${answer}"`)
  
  // 空の回答や無効な回答の場合は0を返す（NAとして扱う）
  if (!answer || answer.trim() === '' || answer === 'null' || answer === 'undefined') {
    console.log(`Empty or invalid answer (preview): "${answer}" -> 0 (NA)`)
    return 0
  }
  
  if (question.type === 'AGE_GROUP') {
    const numericValue = convertAgeGroupToNumber(answer)
    console.log(`Age group conversion (preview): "${answer}" -> ${numericValue}`)
    return numericValue
  }
  
  if (question.type === 'PREFECTURE') {
    // 都道府県の場合は地方に変換
    const region = PREFECTURE_REGIONS[answer as keyof typeof PREFECTURE_REGIONS]
    const regionMap: { [key: string]: number } = {
      '北海道': 1,
      '東北': 2,
      '関東': 3,
      '中部': 4,
      '関西': 5,
      '中国': 6,
      '四国': 7,
      '九州': 8,
      '沖縄': 9,
    }
    const numericValue = regionMap[region] || 0
    console.log(`Prefecture conversion (preview): "${answer}" -> region: "${region}" -> ${numericValue}`)
    return numericValue
  }
  
  if (question.type === 'CHECKBOX') {
    // 複数選択の場合、選択された項目の合計値または最大値を返す
    const selectedOptions = answer ? answer.split(',') : []
    const options = getQuestionOptions(question)
    
    if (selectedOptions.length === 0) {
      return 0
    }
    
    // 選択された項目のインデックスの合計を返す（順序尺度の場合）
    const totalValue = selectedOptions.reduce((sum, option) => {
      const index = options.indexOf(option) + 1
      return sum + index
    }, 0)
    
    console.log(`CHECKBOX ordinal conversion (preview): "${answer}" -> selected: [${selectedOptions.join(', ')}] -> total: ${totalValue}`)
    return totalValue
  }
  
  if (question.type === 'RADIO' || question.type === 'SELECT') {
    const options = getQuestionOptions(question)
    const numericValue = options.indexOf(answer) + 1
    console.log(`Generic conversion (preview): "${answer}" -> index: ${options.indexOf(answer)} -> ${numericValue}`)
    return numericValue
  }
  
  return 0
}

function processNumericValue(value: number, format: string, question: any, responses: any[]): number {
  // NAの値（0またはNaN）の場合はそのまま返す
  if (value === 0 || isNaN(value)) {
    return value
  }
  
  if (format === 'raw' || format === 'normalized' || format === 'standardized') {
    // 数値データの統計を計算（NAでない値のみ）
    const numericValues: number[] = []
    
    responses.forEach(response => {
      const answer = response.answers.find((a: any) => a.questionId === question.id)
      if (answer && answer.value) {
        const numericValue = convertToNumeric(question, answer.value)
        if (!isNaN(numericValue) && numericValue !== 0) {
          numericValues.push(numericValue)
        }
      }
    })
    
    if (numericValues.length === 0) {
      return value
    }
    
    const mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
    const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numericValues.length
    const stdDev = Math.sqrt(variance)
    
    if (format === 'normalized') {
      // 正規化: (x - min) / (max - min)
      const min = Math.min(...numericValues)
      const max = Math.max(...numericValues)
      if (max === min) return 0
      return (value - min) / (max - min)
    } else if (format === 'standardized') {
      // 標準化: (x - mean) / std
      if (stdDev === 0) return 0
      return (value - mean) / stdDev
    }
  }
  
  return value
}

function formatToTokyoTime(dateString: string): string {
  const date = new Date(dateString)
  const tokyoTime = new Date(date.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return tokyoTime.toISOString().replace('T', ' ').slice(0, 16)
}

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
