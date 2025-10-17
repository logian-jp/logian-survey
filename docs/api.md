# Logian Survey API Documentation

Logian Surveyの外部連携用APIの仕様書です。

## 認証

### APIキー認証
APIキーを使用して認証する場合、リクエストヘッダーに`x-api-key`を含めてください。

```http
x-api-key: your-api-key-here
```

### ユーザー認証
NextAuth.jsのセッション認証を使用する場合、ログイン後のセッションクッキーが必要です。

## エンドポイント

### アンケート一覧取得

```http
GET /api/v1/surveys
```

#### クエリパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|-----------|----|-----------|----|
| limit | number | 50 | 取得件数 |
| offset | number | 0 | オフセット |
| status | string | - | ステータスフィルター (DRAFT, ACTIVE, CLOSED) |

#### レスポンス

```json
{
  "surveys": [
    {
      "id": "survey_id",
      "title": "アンケートタイトル",
      "description": "アンケートの説明",
      "status": "ACTIVE",
      "shareUrl": "share_url",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "questionCount": 5,
      "responseCount": 10
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 100
  }
}
```

### アンケート作成

```http
POST /api/v1/surveys
```

#### リクエストボディ

```json
{
  "title": "アンケートタイトル",
  "description": "アンケートの説明",
  "questions": [
    {
      "type": "TEXT",
      "title": "質問文",
      "description": "質問の説明",
      "required": true,
      "options": ["選択肢1", "選択肢2"],
      "settings": {
        "ordinalStructure": false,
        "naHandling": "keep"
      }
    }
  ]
}
```

#### レスポンス

```json
{
  "id": "survey_id",
  "title": "アンケートタイトル",
  "description": "アンケートの説明",
  "status": "DRAFT",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### アンケート詳細取得

```http
GET /api/v1/surveys/{id}
```

#### レスポンス

```json
{
  "id": "survey_id",
  "title": "アンケートタイトル",
  "description": "アンケートの説明",
  "status": "ACTIVE",
  "shareUrl": "share_url",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "responseCount": 10,
  "questions": [
    {
      "id": "question_id",
      "type": "TEXT",
      "title": "質問文",
      "description": "質問の説明",
      "required": true,
      "order": 0,
      "options": ["選択肢1", "選択肢2"],
      "settings": {
        "ordinalStructure": false,
        "naHandling": "keep"
      }
    }
  ]
}
```

### アンケート更新

```http
PUT /api/v1/surveys/{id}
```

#### リクエストボディ

```json
{
  "title": "更新されたタイトル",
  "description": "更新された説明",
  "status": "ACTIVE"
}
```

#### レスポンス

```json
{
  "id": "survey_id",
  "title": "更新されたタイトル",
  "description": "更新された説明",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### アンケート削除

```http
DELETE /api/v1/surveys/{id}
```

#### レスポンス

```json
{
  "message": "Survey deleted successfully"
}
```

### 回答一覧取得

```http
GET /api/v1/surveys/{id}/responses
```

#### クエリパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|-----------|----|-----------|----|
| limit | number | 100 | 取得件数 |
| offset | number | 0 | オフセット |
| format | string | json | 出力形式 (json, csv) |

#### レスポンス (JSON)

```json
{
  "survey": {
    "id": "survey_id",
    "title": "アンケートタイトル",
    "description": "アンケートの説明"
  },
  "responses": [
    {
      "id": "response_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "answers": {
        "question_id_1": "回答1",
        "question_id_2": "回答2"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 50
  }
}
```

#### レスポンス (CSV)

CSVファイルとしてダウンロードされます。

### 回答送信

```http
POST /api/v1/surveys/{id}/responses
```

#### リクエストボディ

```json
{
  "answers": {
    "question_id_1": "回答1",
    "question_id_2": ["選択肢1", "選択肢2"]
  }
}
```

#### レスポンス

```json
{
  "id": "response_id",
  "message": "Response submitted successfully"
}
```

## 質問タイプ

| タイプ | 説明 | オプション | 順序構造 |
|--------|------|-----------|----------|
| TEXT | テキスト入力 | - | - |
| TEXTAREA | 長文テキスト | - | - |
| NUMBER | 数値入力 | - | - |
| EMAIL | メールアドレス | - | - |
| PHONE | 電話番号 | - | - |
| DATE | 日付 | - | - |
| RADIO | 単一選択 | 必要 | 可能 |
| CHECKBOX | 複数選択 | 必要 | 可能 |
| SELECT | ドロップダウン | 必要 | 可能 |
| RATING | 評価 | 必要 | 可能 |
| PREFECTURE | 都道府県 | 自動設定 | 不可 |
| NAME | 名前 | - | - |
| AGE_GROUP | 年代 | 自動設定 | 可能 |

## エラーコード

| ステータスコード | 説明 |
|----------------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエストエラー |
| 401 | 認証エラー |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |

## 使用例

### JavaScript (fetch)

```javascript
// APIキーを使用した認証
const response = await fetch('/api/v1/surveys', {
  method: 'GET',
  headers: {
    'x-api-key': 'your-api-key-here',
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log(data);
```

### Python (requests)

```python
import requests

# APIキーを使用した認証
headers = {
    'x-api-key': 'your-api-key-here',
    'Content-Type': 'application/json',
}

response = requests.get('/api/v1/surveys', headers=headers)
data = response.json()
print(data)
```

### cURL

```bash
# アンケート一覧取得
curl -X GET \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  "https://your-domain.com/api/v1/surveys"

# アンケート作成
curl -X POST \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "テストアンケート",
    "description": "テスト用のアンケートです",
    "questions": [
      {
        "type": "TEXT",
        "title": "お名前を教えてください",
        "required": true
      }
    ]
  }' \
  "https://your-domain.com/api/v1/surveys"
```

## レート制限

APIにはレート制限が設定されています：

- 1時間あたり1000リクエスト
- 1分あたり100リクエスト

レート制限に達した場合、HTTPステータスコード429が返されます。

## サポート

APIに関する質問や問題がある場合は、GitHubのIssuesページで報告してください。
