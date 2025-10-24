# Stripe決済システム設定ガイド

## 概要
このプロジェクトにStripe決済システムが統合されました。サブスクリプション管理、決済処理、Webhook処理が含まれています。

## 必要な設定

### 1. Stripeアカウントの設定
1. [Stripe Dashboard](https://dashboard.stripe.com/)にアクセス
2. アカウントを作成またはログイン
3. テストモードと本番モードのAPIキーを取得

### 2. 環境変数の設定
`.env.local`ファイルに以下の環境変数を追加：

```env
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..." # テスト用秘密鍵
STRIPE_PUBLISHABLE_KEY="pk_test_..." # テスト用公開鍵
STRIPE_WEBHOOK_SECRET="whsec_..." # Webhook秘密鍵
STRIPE_PRICE_ID_STANDARD="price_..." # スタンダードプランの価格ID
STRIPE_PRICE_ID_PROFESSIONAL="price_..." # プロフェッショナルプランの価格ID
STRIPE_PRICE_ID_ENTERPRISE="price_..." # エンタープライズプランの価格ID
STRIPE_PRICE_ID_ONETIME="price_..." # 単発プランの価格ID
```

### 3. Stripe Products & Pricesの作成
Stripe Dashboardで以下の商品と価格を作成：

#### 商品作成
1. Products → Add Product
2. 各プランに対応する商品を作成：
   - スタンダードプラン（月額2,980円）
   - プロフェッショナルプラン（月額9,800円）
   - エンタープライズプラン（月額29,800円）
   - 単発無制限プラン（10,000円）

#### 価格設定
- 通貨: JPY
- 課金間隔: 月次（サブスクリプション）または一回限り（単発）
- 価格IDをコピーして環境変数に設定

### 4. Webhookの設定
1. Stripe Dashboard → Webhooks → Add endpoint
2. エンドポイントURL: `https://yourdomain.com/api/stripe/webhook`
3. イベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Webhook秘密鍵をコピーして環境変数に設定

## 実装された機能

### 1. 決済処理
- **StripeCheckoutコンポーネント**: 決済ボタンとStripe Checkoutセッション作成
- **決済API**: `/api/stripe/create-checkout-session`
- **顧客ポータル**: `/api/stripe/create-portal-session`

### 2. Webhook処理
- **Webhookエンドポイント**: `/api/stripe/webhook`
- **自動プラン更新**: 決済完了時にユーザープランを自動更新
- **サブスクリプション管理**: 作成、更新、キャンセル処理

### 3. UI統合
- **プランページ**: 既存のプラン選択ページにStripe決済を統合
- **設定ページ**: サブスクリプション管理ポータルへのアクセス
- **決済コンポーネント**: 再利用可能な決済UIコンポーネント

## 使用方法

### 1. 決済フロー
1. ユーザーがプランページでプランを選択
2. StripeCheckoutコンポーネントが決済セッションを作成
3. Stripe Checkoutページにリダイレクト
4. 決済完了後、Webhookがプランを自動更新
5. ユーザーは設定ページでサブスクリプションを管理可能

### 2. サブスクリプション管理
- 支払い方法の変更
- 請求履歴の確認
- サブスクリプションのキャンセル
- プランの変更

## セキュリティ考慮事項

### 1. Webhook検証
- Stripe署名の検証
- 環境変数での秘密鍵管理
- エラーハンドリング

### 2. データ保護
- 顧客情報の暗号化
- 決済情報のStripe側での管理
- セッション管理

## テスト方法

### 1. テストカード
Stripeのテストカードを使用：
- 成功: `4242424242424242`
- 失敗: `4000000000000002`
- 3D Secure: `4000002500003155`

### 2. Webhookテスト
- Stripe CLIを使用してローカルでWebhookをテスト
- テストイベントの送信

## 本番環境への移行

### 1. 本番用APIキー
- テストキーを本番キーに変更
- 本番用Webhookエンドポイントの設定

### 2. 価格設定
- 本番環境での価格IDの確認
- 通貨設定の確認

### 3. 監視
- 決済エラーの監視
- Webhook処理の監視
- サブスクリプション状態の監視

## トラブルシューティング

### よくある問題
1. **Webhookが動作しない**: エンドポイントURLと署名の確認
2. **決済が完了しない**: 価格IDと商品設定の確認
3. **プランが更新されない**: データベース接続とWebhook処理の確認

### ログ確認
- サーバーログでのWebhook処理確認
- Stripe Dashboardでのイベント履歴確認
- データベースでのプラン状態確認
