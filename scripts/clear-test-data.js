// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();

console.log('⚠️  このスクリプトはSupabase SDK移行により一時無効化されています');
process.exit(0);

async function clearTestData() {
  try {
    console.log('🧹 Clearing test data...');

    // 既存のデータを削除（外部キー制約の順序で削除）
    await prisma.answer.deleteMany();
    console.log('✅ Deleted answers');

    await prisma.response.deleteMany();
    console.log('✅ Deleted responses');

    await prisma.question.deleteMany();
    console.log('✅ Deleted questions');

    await prisma.surveyUser.deleteMany();
    console.log('✅ Deleted survey users');

    await prisma.survey.deleteMany();
    console.log('✅ Deleted surveys');

    await prisma.userPlan.deleteMany();
    console.log('✅ Deleted user plans');

    // 既存のユーザー（noutomi0729@gmail.com）以外を削除
    await prisma.user.deleteMany({
      where: {
        email: {
          not: 'noutomi0729@gmail.com'
        }
      }
    });
    console.log('✅ Deleted test users (keeping noutomi0729@gmail.com)');

    console.log('🎉 Test data cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData();
