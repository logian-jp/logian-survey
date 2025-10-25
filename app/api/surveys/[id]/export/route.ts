import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Supabase クライアントの設定
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
import { PREFECTURE_REGIONS, convertAgeGroupToNumber } from '@/lib/survey-parts'
import { checkExportFormat } from '@/lib/plan-check'
import { translateVariableName } from '@/lib/variable-translation'
import { getPlanLimits } from '@/lib/plan-limits'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: surveyId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'raw' // raw, onehot, normalized, standardized
    const includePersonalData = searchParams.get('includePersonalData') === 'true'
    const convertToEnglish = searchParams.get('convertToEnglish') === 'true'
    
    let customHeaders = { responseId: '回答ID', responseDate: '回答日時' }
    let variableNames = {}
    
    try {
      if (searchParams.get('customHeaders')) {
        customHeaders = JSON.parse(searchParams.get('customHeaders')!)
      }
      if (searchParams.get('variableNames')) {
        variableNames = JSON.parse(searchParams.get('variableNames')!)
      }
    } catch (error) {
      console.error('Error parsing custom parameters:', error)
    }
    
    console.log('Export API parameters:', {
      format,
      includePersonalData,
      convertToEnglish,
      customHeaders,
      variableNames
    })

    // プラン制限チェック
    const formatCheck = await checkExportFormat(session.user.id, format)
    if (!formatCheck.allowed) {
      return NextResponse.json(
        { message: formatCheck.message },
        { status: 403 }
      )
    }

    // アンケートの所有者を確認
    const { data: survey, error: surveyError } = await supabase
      .from('Survey')
      .select(`
        *,
        questions:Question(*),
        responses:Response(*, answers:Answer(*))
      `)
      .eq('id', surveyId)
      .eq('userId', session.user.id)
      .single()

    if (surveyError) {
      console.error('Error fetching survey:', surveyError)
      return NextResponse.json({ message: 'Failed to fetch survey' }, { status: 500 })
    }

    // Supabaseでは質問の順序を手動でソート
    if (survey?.questions) {
      survey.questions.sort((a: {order?: number}, b: {order?: number}) => (a.order || 0) - (b.order || 0))
    }

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // 保存期間チェック（回答募集終了後、プランの保存期間を超えている場合はブロック）
    // 一時的にスキップしてCSV生成に集中
    console.log('Skipping data retention check for debugging')

    // CSVデータを生成
    const csvData = generateCSVData(survey, format, includePersonalData, convertToEnglish, customHeaders, variableNames)

    // CSVファイル名を生成（URLエンコードして安全にする）
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${survey.title}_${format}_${timestamp}.csv`
    const encodedFilename = encodeURIComponent(filename)

    // UTF-8 BOMを追加して日本語文字を正しく処理
    const csvWithBOM = '\uFEFF' + csvData

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    })
  } catch (error) {
    console.error('Failed to export survey:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateCSVData(survey: any, format: string, includePersonalData: boolean, convertToEnglish: boolean = false, customHeaders: any = null, variableNames: any = {}) {
  console.log('generateCSVData called with:', { format, includePersonalData, convertToEnglish })
  
  const questions = survey.questions
  const responses = survey.responses

  // ヘッダー行を生成
  const responseIdHeader = customHeaders?.responseId || (convertToEnglish ? 'response_id' : '回答ID')
  const responseDateHeader = customHeaders?.responseDate || (convertToEnglish ? 'response_date' : '回答日時')
  const headers: string[] = [responseIdHeader, responseDateHeader]
  console.log('Headers:', headers)
  const questionMap: { [key: string]: any } = {}

    questions.forEach((question: any) => {
      const parsedSettings = question.settings ? JSON.parse(question.settings) : {}
      
      // 個人情報の除外チェック
      if (!includePersonalData && ['NAME', 'EMAIL', 'PHONE'].includes(question.type)) {
        return
      }

      const getHeaderName = (baseName: string, suffix: string = '', questionId: string = '') => {
        // カスタム変数名がある場合はそれを使用
        if (questionId && variableNames[questionId]) {
          const customName = variableNames[questionId]
          return suffix ? `${customName}_${suffix}` : customName
        }
        
        const fullName = suffix ? `${baseName}_${suffix}` : baseName
        
        // 都道府県の場合は都道府県名を英語に変換
        if (question.type === 'PREFECTURE' && suffix && convertToEnglish) {
          const prefectureEnglishMap: { [key: string]: string } = {
            '北海道': 'hokkaido',
            '青森県': 'aomori',
            '岩手県': 'iwate',
            '宮城県': 'miyagi',
            '秋田県': 'akita',
            '山形県': 'yamagata',
            '福島県': 'fukushima',
            '茨城県': 'ibaraki',
            '栃木県': 'tochigi',
            '群馬県': 'gunma',
            '埼玉県': 'saitama',
            '千葉県': 'chiba',
            '東京都': 'tokyo',
            '神奈川県': 'kanagawa',
            '新潟県': 'niigata',
            '富山県': 'toyama',
            '石川県': 'ishikawa',
            '福井県': 'fukui',
            '山梨県': 'yamanashi',
            '長野県': 'nagano',
            '岐阜県': 'gifu',
            '静岡県': 'shizuoka',
            '愛知県': 'aichi',
            '三重県': 'mie',
            '滋賀県': 'shiga',
            '京都府': 'kyoto',
            '大阪府': 'osaka',
            '兵庫県': 'hyogo',
            '奈良県': 'nara',
            '和歌山県': 'wakayama',
            '鳥取県': 'tottori',
            '島根県': 'shimane',
            '岡山県': 'okayama',
            '広島県': 'hiroshima',
            '山口県': 'yamaguchi',
            '徳島県': 'tokushima',
            '香川県': 'kagawa',
            '愛媛県': 'ehime',
            '高知県': 'kochi',
            '福岡県': 'fukuoka',
            '佐賀県': 'saga',
            '長崎県': 'nagasaki',
            '熊本県': 'kumamoto',
            '大分県': 'oita',
            '宮崎県': 'miyazaki',
            '鹿児島県': 'kagoshima',
            '沖縄県': 'okinawa'
          }
          const englishSuffix = prefectureEnglishMap[suffix] || suffix.toLowerCase().replace(/県|府|都/g, '')
          return `prefecture_${englishSuffix}`
        }
        
        return convertToEnglish ? translateVariableName(fullName) : fullName
      }

      if (format === 'raw') {
        headers.push(getHeaderName(question.title, '', question.id))
        questionMap[question.id] = { question, settings: parsedSettings }
      } else if (format === 'onehot') {
        // OHE形式：カテゴリ変数をOne-Hot Encodingで展開
        if (['RADIO', 'SELECT', 'PREFECTURE', 'CHECKBOX'].includes(question.type)) {
          const options = getQuestionOptions(question)
          options.forEach(option => {
            headers.push(getHeaderName(question.title, option, question.id))
          })
        } else if (question.type === 'AGE_GROUP') {
          // 年齢グループは数値として1列で表示
          headers.push(getHeaderName(question.title, 'numeric', question.id))
        } else {
          // その他はそのまま
          headers.push(getHeaderName(question.title, '', question.id))
        }
        questionMap[question.id] = { question, settings: parsedSettings }
      } else {
        // 分析用の列を生成
        if (question.type === 'AGE_GROUP') {
          // 年齢グループは順序構造があるカテゴリ変数として1列で表示
          headers.push(getHeaderName(question.title, 'numeric', question.id))
        } else if (['RADIO', 'SELECT', 'PREFECTURE'].includes(question.type)) {
          if (parsedSettings.ordinalStructure) {
            // 順序構造がある場合、数値変換（1列）
            headers.push(getHeaderName(question.title, 'numeric', question.id))
          } else {
            // 順序構造がない場合、One-Hot Encoding
            const options = getQuestionOptions(question)
            options.forEach(option => {
              headers.push(getHeaderName(question.title, option, question.id))
            })
          }
        } else if (question.type === 'CHECKBOX') {
          if (parsedSettings.ordinalStructure) {
            // 順序構造がある複数選択の場合、数値変換（1列）
            headers.push(getHeaderName(question.title, 'numeric', question.id))
          } else {
            // 順序構造がない複数選択の場合、One-Hot Encoding
            const options = getQuestionOptions(question)
            options.forEach(option => {
              headers.push(getHeaderName(question.title, option, question.id))
            })
          }
        } else {
          headers.push(getHeaderName(question.title, '', question.id))
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
    
    // 回答をマップに変換（データ整合性チェック付き）
    response.answers.forEach((answer: any) => {
      // 質問IDが存在するかチェック
      const question = questions.find((q: any) => q.id === answer.questionId)
      if (question) {
        answerMap[answer.questionId] = answer.value
        console.log(`Valid answer mapping: Q${question.title} -> ${answer.value}`)
      } else {
        console.warn(`Invalid answer mapping: questionId ${answer.questionId} not found`)
      }
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
      } else if (format === 'onehot') {
        // OHE形式のデータ処理
        if (['RADIO', 'SELECT', 'PREFECTURE', 'CHECKBOX'].includes(question.type)) {
          const options = getQuestionOptions(question)
          if (question.type === 'CHECKBOX') {
            // 複数選択の場合
            const selectedOptions = answer ? answer.split(',') : []
            options.forEach(option => {
              const isSelected = selectedOptions.includes(option) ? '1' : '0'
              rowData.push(escapeCSVValue(isSelected))
            })
          } else {
            // 単一選択の場合
            options.forEach(option => {
              const isSelected = answer === option ? '1' : '0'
              rowData.push(escapeCSVValue(isSelected))
            })
          }
        } else if (question.type === 'AGE_GROUP' || question.type === 'RATING') {
          // 年齢グループと評価は数値として1列で表示
          const numericValue = convertToNumeric(question, answer)
          console.log(`Export OHE ${question.type} processing: format=${format}, numericValue=${numericValue}`)
          const processedValue = processNumericValue(numericValue, format, question, responses)
          console.log(`Export OHE ${question.type} processed: ${processedValue}`)
          const displayValue = (numericValue === 0 || isNaN(processedValue)) ? 'NA' : String(processedValue)
          rowData.push(escapeCSVValue(displayValue))
        } else {
          // その他はそのまま
          rowData.push(escapeCSVValue(answer))
        }
      } else {
        // 分析用のデータ変換
        if (question.type === 'AGE_GROUP' || question.type === 'RATING') {
          // 年齢グループと評価は順序構造があるカテゴリ変数として1列で表示
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
            console.log('CHECKBOX processing:', {
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
  console.log('getQuestionOptions called for question:', {
    id: question.id,
    type: question.type,
    title: question.title,
    options: question.options,
    optionsType: typeof question.options
  })
  
  if (question.options) {
    try {
      const parsed = JSON.parse(question.options)
      console.log('Parsed options:', parsed)
      return parsed
    } catch (error) {
      console.error('Failed to parse options:', error, 'Raw options:', question.options)
      return []
    }
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
    return ['10代以下', '20代', '30代', '40代', '50代', '60代', '70代以上']
  }
  
  return []
}

function convertToNumeric(question: any, answer: string): number {
  console.log(`Converting to numeric: ${question.type} - "${answer}"`)
  
  // 空の回答や無効な回答の場合は0を返す（NAとして扱う）
  if (!answer || answer.trim() === '' || answer === 'null' || answer === 'undefined') {
    console.log(`Empty or invalid answer: "${answer}" -> 0 (NA)`)
    return 0
  }
  
  if (question.type === 'AGE_GROUP') {
    const numericValue = convertAgeGroupToNumber(answer)
    console.log(`Age group conversion: "${answer}" -> ${numericValue}`)
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
    console.log(`Prefecture conversion: "${answer}" -> region: "${region}" -> ${numericValue}`)
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
    
    console.log(`CHECKBOX ordinal conversion: "${answer}" -> selected: [${selectedOptions.join(', ')}] -> total: ${totalValue}`)
    return totalValue
  }
  
  if (question.type === 'RATING') {
    // 評価は数値として直接返す
    const numericValue = parseInt(answer, 10)
    console.log(`RATING conversion: "${answer}" -> ${numericValue}`)
    return isNaN(numericValue) ? 0 : numericValue
  }
  
  // その他の場合は選択肢のインデックスを返す
  const options = getQuestionOptions(question)
  const numericValue = options.indexOf(answer) + 1
  console.log(`Generic conversion: "${answer}" -> index: ${options.indexOf(answer)} -> ${numericValue}`)
  return numericValue
}

function processNumericValue(value: number, format: string, question: any, responses: any[]): number {
  console.log(`Export processNumericValue called: value=${value}, format=${format}, questionId=${question.id}`)
  
  // NAの値（0またはNaN）の場合はそのまま返す
  if (value === 0 || isNaN(value)) {
    console.log(`Export processNumericValue: returning original value (NA): ${value}`)
    return value
  }
  
  if (format === 'normalized' || format === 'standardized') {
    console.log(`Export processNumericValue: processing ${format} for question ${question.id}`)
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
    
    console.log(`Export Statistics: mean=${mean}, stdDev=${stdDev}, numericValues=[${numericValues.join(',')}]`)
    
    if (format === 'normalized') {
      // 正規化: (x - min) / (max - min)
      const min = Math.min(...numericValues)
      const max = Math.max(...numericValues)
      console.log(`Export Normalization: min=${min}, max=${max}, value=${value}`)
      if (max === min) return 0
      const result = (value - min) / (max - min)
      console.log(`Export Normalized result: ${result}`)
      return result
    } else if (format === 'standardized') {
      // 標準化: (x - mean) / std
      console.log(`Export Standardization: mean=${mean}, stdDev=${stdDev}, value=${value}`)
      if (stdDev === 0) return 0
      const result = (value - mean) / stdDev
      console.log(`Export Standardized result: ${result}`)
      return result
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
