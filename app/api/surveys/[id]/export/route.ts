import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PREFECTURE_REGIONS, convertAgeGroupToNumber } from '@/lib/survey-parts'
import { checkExportFormat } from '@/lib/plan-check'

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
    const format = searchParams.get('format') || 'raw' // raw, normalized, standardized
    const includePersonalData = searchParams.get('includePersonalData') === 'true'

    // プラン制限チェック
    const formatCheck = await checkExportFormat(session.user.id, format)
    if (!formatCheck.allowed) {
      return NextResponse.json(
        { message: formatCheck.message },
        { status: 403 }
      )
    }

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
        },
      },
    })

    if (!survey) {
      return NextResponse.json(
        { message: 'Survey not found' },
        { status: 404 }
      )
    }

    // CSVデータを生成
    const csvData = generateCSVData(survey, format, includePersonalData)

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
      if (['RADIO', 'SELECT', 'PREFECTURE', 'AGE_GROUP'].includes(question.type)) {
        if (parsedSettings.ordinalStructure) {
          // 順序構造がある場合、数値変換
          headers.push(`${question.title}_numeric`)
        } else {
          // 順序構造がない場合、One-Hot Encoding
          const options = getQuestionOptions(question)
          options.forEach(option => {
            headers.push(`${question.title}_${option}`)
          })
        }
      } else if (question.type === 'CHECKBOX') {
        const options = getQuestionOptions(question)
        options.forEach(option => {
          headers.push(`${question.title}_${option}`)
        })
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
        if (['RADIO', 'SELECT', 'PREFECTURE'].includes(question.type)) {
          if (parsedSettings.ordinalStructure) {
            // 順序構造がある場合、数値変換
            const numericValue = convertToNumeric(question, answer)
            rowData.push(escapeCSVValue(String(numericValue)))
          } else {
            // 順序構造がない場合、One-Hot Encoding
            const options = getQuestionOptions(question)
            options.forEach(option => {
              const isSelected = answer === option ? '1' : '0'
              rowData.push(escapeCSVValue(isSelected))
            })
          }
        } else if (question.type === 'AGE_GROUP') {
          // 年齢グループは順序構造があるカテゴリ変数として1列で表示
          const numericValue = convertToNumeric(question, answer)
          rowData.push(escapeCSVValue(String(numericValue)))
        } else if (question.type === 'CHECKBOX') {
          // 複数選択の場合、One-Hot Encoding
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
  if (question.type === 'AGE_GROUP') {
    return convertAgeGroupToNumber(answer)
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
    return regionMap[region] || 0
  }
  
  // その他の場合は選択肢のインデックスを返す
  const options = getQuestionOptions(question)
  return options.indexOf(answer) + 1
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
