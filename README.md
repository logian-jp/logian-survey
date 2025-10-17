# Logian Survey

分析に特化したアンケートツールです。Googleフォームのような使いやすさで、データ分析に最適化された結果を出力します。

## 特徴

### 🎯 分析に最適化
- カテゴリ変数の順序構造判定
- NA（欠損値）の取り扱い設定
- One-Hot Encoding対応
- 数値変換機能

### 🇯🇵 日本市場特化
- 都道府県選択パーツ
- 年代選択パーツ
- 名前・電話番号・メールアドレスパーツ
- 地方別の集計機能

### 📊 柔軟な出力
- 通常のCSV出力
- 分析用CSV出力（One-Hot Encoding）
- 個人情報の除外設定
- 正規化・標準化対応

### 🔐 セキュア
- ログイン機能（NextAuth.js）
- アンケートの権限管理
- 共有URL機能

## 技術スタック

- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL, Prisma
- **認証**: NextAuth.js
- **デプロイ**: Vercel推奨

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd logian-survey
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の変数を設定してください：

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/logian_survey"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

### 4. データベースのセットアップ

```bash
# Prismaクライアントの生成
npm run db:generate

# データベースのマイグレーション
npm run db:push

# データベーススタジオの起動（オプション）
npm run db:studio
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認してください。

## 使用方法

### 1. アカウント作成・ログイン
- ホームページから新規登録またはログイン
- Googleアカウントでのログインも可能

### 2. アンケート作成
- ダッシュボードから「新しいアンケートを作成」をクリック
- アンケートのタイトルと説明を入力
- 質問を追加し、分析設定を構成

### 3. 質問タイプ
- **テキスト入力**: 一行のテキスト
- **長文テキスト**: 複数行のテキスト
- **数値入力**: 数値のみ
- **メールアドレス**: メール形式の検証
- **電話番号**: 電話番号形式
- **日付**: 日付選択
- **単一選択**: ラジオボタンまたはドロップダウン
- **複数選択**: チェックボックス
- **評価**: 5段階評価など
- **都道府県**: 日本47都道府県
- **名前**: 氏名入力
- **年代**: 年代選択

### 4. 分析設定
- **順序構造**: カテゴリ変数に順序があるかどうか
- **NA取り扱い**: 欠損値の処理方法
- **出力設定**: 個人情報の除外設定

### 5. アンケート共有
- アンケート作成後、共有URLを生成
- URLを回答者に共有して回答を収集

### 6. データ出力
- 回答データをCSV形式で出力
- 通常データと分析用データの両方をサポート
- 個人情報の除外設定に対応

## API仕様

### 認証が必要なエンドポイント

```
GET  /api/surveys              - アンケート一覧取得
POST /api/surveys              - アンケート作成
POST /api/questions            - 質問作成
POST /api/surveys/[id]/share   - アンケート共有
GET  /api/surveys/[id]/export  - データ出力
```

### 公開エンドポイント

```
GET  /api/survey/[shareUrl]    - 共有アンケート取得
POST /api/responses            - 回答送信
```

## データベーススキーマ

### 主要テーブル

- **User**: ユーザー情報
- **Survey**: アンケート情報
- **Question**: 質問情報
- **Response**: 回答情報
- **Answer**: 個別回答

### 質問タイプ

```typescript
enum QuestionType {
  TEXT, TEXTAREA, NUMBER, EMAIL, PHONE, DATE,
  RADIO, CHECKBOX, SELECT, RATING,
  PREFECTURE, NAME, AGE_GROUP
}
```

## デプロイ

### Vercelでのデプロイ

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定
3. データベース（PostgreSQL）を設定
4. デプロイを実行

### 環境変数の設定

本番環境では以下の環境変数を設定してください：

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

問題が発生した場合は、GitHubのIssuesページで報告してください。
