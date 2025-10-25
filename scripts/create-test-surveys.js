// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestSurveys() {
  try {
    console.log('Creating test surveys...');

    // 既存のユーザーを取得
    const users = await prisma.user.findMany({
      include: {
        userPlan: true
      }
    });

    if (users.length === 0) {
      console.log('No users found. Please create users first.');
      return;
    }

    // テスト用アンケートデータ
    const testSurveys = [
      {
        title: '顧客満足度調査',
        description: '弊社のサービスに対する満足度をお聞かせください。',
        isPublished: true,
        maxResponses: 100,
        targetResponses: 50,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30日後
      },
      {
        title: '商品アンケート',
        description: '新商品についてのご意見をお聞かせください。',
        isPublished: true,
        maxResponses: 200,
        targetResponses: 100,
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60日後
      },
      {
        title: '従業員満足度調査',
        description: '職場環境についてのご意見をお聞かせください。',
        isPublished: true,
        maxResponses: 50,
        targetResponses: 30,
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14日後
      },
      {
        title: '市場調査',
        description: '消費者の購買行動について調査いたします。',
        isPublished: true,
        maxResponses: 500,
        targetResponses: 300,
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90日後
      },
      {
        title: 'イベント満足度調査',
        description: '先日開催されたイベントについてのご感想をお聞かせください。',
        isPublished: true,
        maxResponses: 100,
        targetResponses: 80,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7日後
      }
    ];

    for (let i = 0; i < testSurveys.length; i++) {
      const surveyData = testSurveys[i];
      const user = users[i % users.length]; // ユーザーを順番に割り当て

      // アンケートを作成
      const survey = await prisma.survey.create({
        data: {
          title: surveyData.title,
          description: surveyData.description,
          isPublished: surveyData.isPublished,
          maxResponses: surveyData.maxResponses,
          targetResponses: surveyData.targetResponses,
          endDate: surveyData.endDate,
          userId: user.id,
          surveyUsers: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      });

      console.log(`Created survey: ${survey.title} by ${user.name}`);

      // テスト用の質問を追加
      const questions = [
        {
          type: 'TEXT',
          text: 'お名前を教えてください',
          isRequired: true,
          order: 1
        },
        {
          type: 'RADIO',
          text: '満足度はいかがですか？',
          options: ['非常に満足', '満足', '普通', '不満', '非常に不満'],
          isRequired: true,
          order: 2
        },
        {
          type: 'CHECKBOX',
          text: '興味のある分野を選択してください（複数選択可）',
          options: ['技術', 'ビジネス', 'デザイン', 'マーケティング', 'その他'],
          isRequired: false,
          order: 3
        },
        {
          type: 'SELECT',
          text: '年齢層を選択してください',
          options: ['20代', '30代', '40代', '50代', '60代以上'],
          isRequired: true,
          order: 4
        }
      ];

      for (const questionData of questions) {
        await prisma.question.create({
          data: {
            type: questionData.type,
            text: questionData.text,
            options: questionData.options,
            isRequired: questionData.isRequired,
            order: questionData.order,
            surveyId: survey.id
          }
        });
      }

      console.log(`Added questions to survey: ${survey.title}`);
    }

    console.log('Test surveys created successfully!');
  } catch (error) {
    console.error('Error creating test surveys:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSurveys();
