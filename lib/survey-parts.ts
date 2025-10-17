// 日本市場向けの事前定義パーツ

export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
]

export const PREFECTURE_REGIONS = {
  '北海道': '北海道',
  '青森県': '東北',
  '岩手県': '東北',
  '宮城県': '東北',
  '秋田県': '東北',
  '山形県': '東北',
  '福島県': '東北',
  '茨城県': '関東',
  '栃木県': '関東',
  '群馬県': '関東',
  '埼玉県': '関東',
  '千葉県': '関東',
  '東京都': '関東',
  '神奈川県': '関東',
  '新潟県': '中部',
  '富山県': '中部',
  '石川県': '中部',
  '福井県': '中部',
  '山梨県': '中部',
  '長野県': '中部',
  '岐阜県': '中部',
  '静岡県': '中部',
  '愛知県': '中部',
  '三重県': '関西',
  '滋賀県': '関西',
  '京都府': '関西',
  '大阪府': '関西',
  '兵庫県': '関西',
  '奈良県': '関西',
  '和歌山県': '関西',
  '鳥取県': '中国',
  '島根県': '中国',
  '岡山県': '中国',
  '広島県': '中国',
  '山口県': '中国',
  '徳島県': '四国',
  '香川県': '四国',
  '愛媛県': '四国',
  '高知県': '四国',
  '福岡県': '九州',
  '佐賀県': '九州',
  '長崎県': '九州',
  '熊本県': '九州',
  '大分県': '九州',
  '宮崎県': '九州',
  '鹿児島県': '九州',
  '沖縄県': '沖縄'
}

export const AGE_GROUPS = [
  '10代以下',
  '20代',
  '30代',
  '40代',
  '50代',
  '60代',
  '70代以上'
]

// 質問タイプの設定
export const QUESTION_TYPE_CONFIG = {
  TEXT: {
    label: 'テキスト入力',
    description: '一行のテキスト入力',
    hasOptions: false,
    hasOrdinalSettings: false,
  },
  TEXTAREA: {
    label: '長文テキスト',
    description: '複数行のテキスト入力',
    hasOptions: false,
    hasOrdinalSettings: false,
  },
  NUMBER: {
    label: '数値入力',
    description: '数値の入力',
    hasOptions: false,
    hasOrdinalSettings: false,
  },
  EMAIL: {
    label: 'メールアドレス',
    description: 'メールアドレスの入力',
    hasOptions: false,
    hasOrdinalSettings: false,
  },
  PHONE: {
    label: '電話番号',
    description: '電話番号の入力',
    hasOptions: false,
    hasOrdinalSettings: false,
  },
  DATE: {
    label: '日付',
    description: '日付の入力',
    hasOptions: false,
    hasOrdinalSettings: false,
  },
  RADIO: {
    label: '単一選択（ラジオボタン）',
    description: '一つだけ選択可能',
    hasOptions: true,
    hasOrdinalSettings: true,
  },
  CHECKBOX: {
    label: '複数選択（チェックボックス）',
    description: '複数選択可能',
    hasOptions: true,
    hasOrdinalSettings: true,
  },
  SELECT: {
    label: '単一選択（ドロップダウン）',
    description: 'ドロップダウンから一つ選択',
    hasOptions: true,
    hasOrdinalSettings: true,
  },
  RATING: {
    label: '評価',
    description: '5段階評価など',
    hasOptions: true,
    hasOrdinalSettings: true,
  },
  PREFECTURE: {
    label: '都道府県',
    description: '都道府県の選択',
    hasOptions: false,
    hasOrdinalSettings: false,
    predefinedOptions: PREFECTURES,
  },
  NAME: {
    label: '名前',
    description: '氏名の入力',
    hasOptions: false,
    hasOrdinalSettings: false,
  },
  AGE_GROUP: {
    label: '年代',
    description: '年代の選択',
    hasOptions: false,
    hasOrdinalSettings: true,
    predefinedOptions: AGE_GROUPS,
  },
}

// データ変換用のヘルパー関数
export function convertPrefectureToRegion(prefecture: string): string {
  return PREFECTURE_REGIONS[prefecture as keyof typeof PREFECTURE_REGIONS] || '不明'
}

export function convertAgeGroupToNumber(ageGroup: string): number {
  const ageMap: { [key: string]: number } = {
    '10代以下': 1,
    '20代': 2,
    '30代': 3,
    '40代': 4,
    '50代': 5,
    '60代': 6,
    '70代以上': 7,
  }
  return ageMap[ageGroup] || 0
}
