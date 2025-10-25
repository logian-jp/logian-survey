// PRISMA DISABLED - Supabase SDK migration in progress
// NOTE: Prisma → Supabase SDK移行済み（一時無効化）

console.log('⚠️  このスクリプトはSupabase SDK移行により一時無効化されています');
process.exit(0);

/* ORIGINAL CODE DISABLED
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
*/

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
      // ユーザーを作成 (Supabase SDK使用)
      const { data: user, error: userError } = await supabase
        .from('User')
        .insert({
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        })
        .select()
        .single()

      if (userError) {
        throw userError
      }

      // NOTE: userPlanテーブル削除により無効化済み（チケット制度移行）
      console.log(`  -> User plan assignment disabled (migrated to ticket system)`)

      console.log(`Created user: ${user.name} (${user.email}) with plan: ${userData.planType}`);
    }

    console.log('Test users created successfully!');
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    // await // prisma.$disconnect();
  }
}

createTestUsers();
