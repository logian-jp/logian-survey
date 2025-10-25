# Supabase Connection Pooling設定ガイド

## 🎯 目的
接続プール枯渇・同時接続数制限問題の解決

## 📋 現在の最適化設定

### 本番環境（Vercel）
```
sslmode=require
pgbouncer=true
connection_limit=1
pool_timeout=20
connect_timeout=10
pool_mode=transaction
statement_cache_size=0
```

### 開発環境
```
sslmode=require
pgbouncer=true
connection_limit=5
pool_timeout=30
connect_timeout=15
pool_mode=session
```

## 🔧 Supabaseダッシュボード設定確認

### 1. Connection Poolingの確認
1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. プロジェクト選択 → **Settings** → **Database**
3. **Connection Pooling** セクションを確認

### 2. 推奨設定
- **Pool Mode**: `Transaction` (本番環境)
- **Pool Size**: `15-20` (デフォルト)
- **Max Client Connections**: `100` (デフォルト)

### 3. Connection String
**Session Pooling URL** (6543ポート) ではなく、
**Transaction Pooling URL** (6543ポート) を使用することを推奨

## 📊 設定効果

### ✅ 解決される問題
- 接続プール枯渇
- 同時接続数制限エラー
- `Can't reach database server` エラー
- 認証フローでの断続的エラー

### 📈 パフォーマンス向上
- 接続確立時間の短縮
- リソース使用量の削減
- エラー率の大幅削減

## 🚨 トラブルシューティング

### 接続エラーが続く場合
1. Supabaseプロジェクトの状態確認
2. 接続制限の確認
3. DNS解決の確認
4. ファイアウォール設定の確認

### デバッグモード有効化
```bash
# 環境変数追加
DEBUG=true
```

## 📝 監視ポイント
- 接続数の監視
- エラー率の監視
- レスポンス時間の監視
- Connection Poolingの効率確認
