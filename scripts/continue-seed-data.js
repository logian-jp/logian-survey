const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function continueSeedData() {
  try {
    console.log('🌱 Continuing to seed survey and response data...');

    // 既存のユーザーを取得
    const users = await prisma.user.findMany({
      include: {
        userPlan: true
      }
    });

    console.log(`Found ${users.length} existing users`);

    // テストアンケートを作成
    console.log('📋 Creating test surveys...');
    const testSurveys = [
      {
        title: '顧客満足度調査',
        description: '弊社のサービスに対する満足度をお聞かせください。',
        status: 'ACTIVE',
        maxResponses: 100,
        targetResponses: 50,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        title: '商品アンケート',
        description: '新商品についてのご意見をお聞かせください。',
        status: 'ACTIVE',
        maxResponses: 200,
        targetResponses: 100,
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      },
      {
        title: '従業員満足度調査',
        description: '職場環境についてのご意見をお聞かせください。',
        status: 'ACTIVE',
        maxResponses: 50,
        targetResponses: 30,
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      {
        title: '市場調査',
        description: '消費者の購買行動について調査いたします。',
        status: 'ACTIVE',
        maxResponses: 500,
        targetResponses: 300,
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'イベント満足度調査',
        description: '先日開催されたイベントについてのご感想をお聞かせください。',
        status: 'ACTIVE',
        maxResponses: 100,
        targetResponses: 80,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ];

    const createdSurveys = [];
    for (let i = 0; i < testSurveys.length; i++) {
      const surveyData = testSurveys[i];
      const user = users[i % users.length];

      const survey = await prisma.survey.create({
        data: {
          title: surveyData.title,
          description: surveyData.description,
          status: surveyData.status,
          maxResponses: surveyData.maxResponses,
          targetResponses: surveyData.targetResponses,
          endDate: surveyData.endDate,
          userId: user.id,
          surveyUsers: {
            create: {
              userId: user.id,
              permission: 'ADMIN',
              invitedBy: user.id
            }
          }
        }
      });
      createdSurveys.push(survey);
      console.log(`✅ Created survey: ${survey.title} by ${user.name}`);

      // 質問を追加
      const questions = [
        {
          type: 'TEXT',
          title: 'お名前を教えてください',
          description: 'お名前を教えてください',
          required: true,
          order: 1
        },
        {
          type: 'RADIO',
          title: '満足度はいかがですか？',
          description: '満足度はいかがですか？',
          options: ['非常に満足', '満足', '普通', '不満', '非常に不満'],
          required: true,
          order: 2
        },
        {
          type: 'CHECKBOX',
          title: '興味のある分野を選択してください（複数選択可）',
          description: '興味のある分野を選択してください（複数選択可）',
          options: ['技術', 'ビジネス', 'デザイン', 'マーケティング', 'その他'],
          required: false,
          order: 3
        },
        {
          type: 'SELECT',
          title: '年齢層を選択してください',
          description: '年齢層を選択してください',
          options: ['20代', '30代', '40代', '50代', '60代以上'],
          required: true,
          order: 4
        }
      ];

      for (const questionData of questions) {
        await prisma.question.create({
          data: {
            type: questionData.type,
            title: questionData.title,
            description: questionData.description,
            options: questionData.options,
            required: questionData.required,
            order: questionData.order,
            surveyId: survey.id
          }
        });
      }
    }

    // テスト回答を作成
    console.log('📝 Creating test responses...');
    const testResponses = [
      { name: '田中太郎', satisfaction: '非常に満足', interests: ['技術', 'ビジネス'], age: '30代' },
      { name: '佐藤花子', satisfaction: '満足', interests: ['デザイン', 'マーケティング'], age: '20代' },
      { name: '鈴木一郎', satisfaction: '普通', interests: ['技術'], age: '40代' },
      { name: '高橋美咲', satisfaction: '満足', interests: ['ビジネス', 'マーケティング'], age: '30代' },
      { name: '山田次郎', satisfaction: '非常に満足', interests: ['技術', 'デザイン'], age: '20代' },
      { name: '渡辺真理', satisfaction: '不満', interests: ['その他'], age: '50代' },
      { name: '伊藤健太', satisfaction: '満足', interests: ['ビジネス'], age: '40代' },
      { name: '中村由美', satisfaction: '非常に満足', interests: ['デザイン'], age: '30代' },
      { name: '小林正雄', satisfaction: '普通', interests: ['技術', 'ビジネス'], age: '50代' },
      { name: '加藤恵子', satisfaction: '満足', interests: ['マーケティング'], age: '40代' }
    ];

    for (const survey of createdSurveys) {
      const surveyWithQuestions = await prisma.survey.findUnique({
        where: { id: survey.id },
        include: {
          questions: {
            orderBy: { order: 'asc' }
          }
        }
      });

      // 各アンケートに対して複数の回答を作成
      for (let i = 0; i < Math.min(8, testResponses.length); i++) {
        const responseData = testResponses[i];
        
        const response = await prisma.response.create({
          data: {
            surveyId: survey.id
          }
        });

        // 各質問に対する回答を作成
        for (const question of surveyWithQuestions.questions) {
          let answerValue = '';

          switch (question.order) {
            case 1:
              answerValue = responseData.name;
              break;
            case 2:
              answerValue = responseData.satisfaction;
              break;
            case 3:
              answerValue = responseData.interests.join(', ');
              break;
            case 4:
              answerValue = responseData.age;
              break;
          }

          await prisma.answer.create({
            data: {
              responseId: response.id,
              questionId: question.id,
              value: answerValue
            }
          });
        }
      }
      console.log(`✅ Created responses for survey: ${survey.title}`);
    }

    console.log('🎉 Test data seeding completed successfully!');
    console.log(`📊 Created ${users.length} users, ${createdSurveys.length} surveys, and multiple responses`);
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

continueSeedData();
