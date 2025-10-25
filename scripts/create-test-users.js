// NOTE: Prisma → Supabase SDK移行済み（一時無効化）
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('Creating test users...');

    // テスト用ユーザーデータ
    const testUsers = [
      {
        name: '田中太郎',
        email: 'tanaka@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'FREE'
      },
      {
        name: '佐藤花子',
        email: 'sato@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'STANDARD'
      },
      {
        name: '鈴木一郎',
        email: 'suzuki@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'PROFESSIONAL'
      },
      {
        name: '高橋美咲',
        email: 'takahashi@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'ENTERPRISE'
      },
      {
        name: '山田次郎',
        email: 'yamada@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'FREE'
      },
      {
        name: '渡辺真理',
        email: 'watanabe@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'STANDARD'
      },
      {
        name: '伊藤健太',
        email: 'ito@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'PROFESSIONAL'
      },
      {
        name: '中村由美',
        email: 'nakamura@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'FREE'
      },
      {
        name: '小林正雄',
        email: 'kobayashi@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'STANDARD'
      },
      {
        name: '加藤恵子',
        email: 'kato@example.com',
        password: 'password123',
        role: 'USER',
        planType: 'ENTERPRISE'
      }
    ];

    for (const userData of testUsers) {
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // ユーザーを作成
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          userPlan: {
            create: {
              planType: userData.planType,
              status: 'ACTIVE',
              startDate: new Date(),
              endDate: userData.planType === 'FREE' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30日後
            }
          }
        }
      });

      console.log(`Created user: ${user.name} (${user.email}) with plan: ${userData.planType}`);
    }

    console.log('Test users created successfully!');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
