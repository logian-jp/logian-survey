// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDataIntegrity() {
  console.log('🔍 データベースの整合性をチェック中...')
  
  try {
    // 1. 存在しない質問IDを持つ回答をチェック
    const invalidAnswers = await prisma.$queryRaw`
      SELECT a.id, a."questionId", a."responseId"
      FROM "Answer" a
      LEFT JOIN "Question" q ON a."questionId" = q.id
      WHERE q.id IS NULL
    `
    
    if (invalidAnswers.length > 0) {
      console.log('❌ 存在しない質問IDを持つ回答が見つかりました:')
      console.log(invalidAnswers)
      
      // 無効な回答を削除
      const deleteResult = await prisma.answer.deleteMany({
        where: {
          questionId: {
            notIn: await prisma.question.findMany({
              select: { id: true }
            }).then(questions => questions.map(q => q.id))
          }
        }
      })
      
      console.log(`🗑️  ${deleteResult.count}件の無効な回答を削除しました`)
    } else {
      console.log('✅ 回答データの整合性は正常です')
    }
    
    // 2. 存在しないアンケートIDを持つ回答をチェック
    const invalidResponses = await prisma.$queryRaw`
      SELECT r.id, r."surveyId"
      FROM "Response" r
      LEFT JOIN "Survey" s ON r."surveyId" = s.id
      WHERE s.id IS NULL
    `
    
    if (invalidResponses.length > 0) {
      console.log('❌ 存在しないアンケートIDを持つ回答が見つかりました:')
      console.log(invalidResponses)
      
      // 無効な回答を削除
      const deleteResult = await prisma.response.deleteMany({
        where: {
          surveyId: {
            notIn: await prisma.survey.findMany({
              select: { id: true }
            }).then(surveys => surveys.map(s => s.id))
          }
        }
      })
      
      console.log(`🗑️  ${deleteResult.count}件の無効な回答を削除しました`)
    } else {
      console.log('✅ 回答データの整合性は正常です')
    }
    
    // 3. 統計情報を表示
    const surveyCount = await prisma.survey.count()
    const questionCount = await prisma.question.count()
    const responseCount = await prisma.response.count()
    const answerCount = await prisma.answer.count()
    
    console.log('\n📊 データベース統計:')
    console.log(`アンケート数: ${surveyCount}`)
    console.log(`質問数: ${questionCount}`)
    console.log(`回答数: ${responseCount}`)
    console.log(`回答詳細数: ${answerCount}`)
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDataIntegrity()
