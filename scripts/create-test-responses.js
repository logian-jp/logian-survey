const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestResponses() {
  try {
    console.log('Creating test responses...');

    // アンケートと質問を取得
    const surveys = await prisma.survey.findMany({
      include: {
        questions: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (surveys.length === 0) {
      console.log('No surveys found. Please create surveys first.');
      return;
    }

    // テスト用の回答データ
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

    for (const survey of surveys) {
      console.log(`Creating responses for survey: ${survey.title}`);

      // 各アンケートに対して複数の回答を作成
      for (let i = 0; i < Math.min(10, testResponses.length); i++) {
        const responseData = testResponses[i];
        
        // 回答を作成
        const response = await prisma.response.create({
          data: {
            surveyId: survey.id,
            submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // 過去7日以内のランダムな日時
          }
        });

        // 各質問に対する回答を作成
        for (const question of survey.questions) {
          let answerValue = '';

          switch (question.order) {
            case 1: // 名前
              answerValue = responseData.name;
              break;
            case 2: // 満足度
              answerValue = responseData.satisfaction;
              break;
            case 3: // 興味分野
              answerValue = responseData.interests.join(', ');
              break;
            case 4: // 年齢層
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

        console.log(`Created response ${i + 1} for survey: ${survey.title}`);
      }
    }

    console.log('Test responses created successfully!');
  } catch (error) {
    console.error('Error creating test responses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestResponses();
