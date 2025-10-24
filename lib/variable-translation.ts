// 日本語の変数名を英語に変換する関数
export function translateVariableName(japaneseName: string): string {
  // 基本的な翻訳マッピング
  const translations: Record<string, string> = {
    // 基本情報
    '名前': 'name',
    '年齢': 'age',
    '性別': 'gender',
    '職業': 'occupation',
    '住所': 'address',
    '電話番号': 'phone',
    'メールアドレス': 'email',
    '生年月日': 'birth_date',
    '年収': 'annual_income',
    '学歴': 'education',
    '家族構成': 'family_structure',
    
    // アンケート関連
    '回答': 'response',
    '質問': 'question',
    '選択肢': 'option',
    '評価': 'rating',
    '満足度': 'satisfaction',
    '重要度': 'importance',
    '頻度': 'frequency',
    '理由': 'reason',
    '意見': 'opinion',
    '感想': 'impression',
    '提案': 'suggestion',
    '問題': 'problem',
    '改善点': 'improvement',
    '要望': 'request',
    
    // 時間関連
    '開始時間': 'start_time',
    '終了時間': 'end_time',
    '期間': 'period',
    '日時': 'datetime',
    '曜日': 'day_of_week',
    '月': 'month',
    '年': 'year',
    
    // 数値関連
    '回数': 'count',
    '金額': 'amount',
    '価格': 'price',
    '費用': 'cost',
    '予算': 'budget',
    '割合': 'ratio',
    'パーセント': 'percentage',
    '点数': 'score',
    'ランク': 'rank',
    '順位': 'ranking',
    
    // 場所関連
    '場所': 'location',
    '地域': 'region',
    '都道府県': 'prefecture',
    '市区町村': 'city',
    '住所': 'address',
    '最寄り駅': 'nearest_station',
    
    // 商品・サービス関連
    '商品': 'product',
    'サービス': 'service',
    'ブランド': 'brand',
    '会社': 'company',
    '企業': 'corporation',
    '組織': 'organization',
    '団体': 'group',
    '学校': 'school',
    '大学': 'university',
    '病院': 'hospital',
    '店舗': 'store',
    '店': 'shop',
    
    // 感情・評価関連
    '好き': 'like',
    '嫌い': 'dislike',
    '良い': 'good',
    '悪い': 'bad',
    '高い': 'high',
    '低い': 'low',
    '多い': 'many',
    '少ない': 'few',
    '大きい': 'large',
    '小さい': 'small',
    '新しい': 'new',
    '古い': 'old',
    '簡単': 'easy',
    '難しい': 'difficult',
    '便利': 'convenient',
    '不便': 'inconvenient',
    '安全': 'safe',
    '危険': 'dangerous',
    '快適': 'comfortable',
    '不快': 'uncomfortable',
    
    // その他
    'その他': 'other',
    '不明': 'unknown',
    '無回答': 'no_answer',
    '特になし': 'none',
    'すべて': 'all',
    '一部': 'partial',
    '完全': 'complete',
    '未完了': 'incomplete'
  }

  // 直接マッピングがある場合はそれを使用
  if (translations[japaneseName]) {
    return translations[japaneseName]
  }

  // 部分一致で翻訳を試行
  for (const [japanese, english] of Object.entries(translations)) {
    if (japaneseName.includes(japanese)) {
      return japaneseName.replace(japanese, english)
      .replace(/[^\w\s]/g, '') // 特殊文字を除去
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .toLowerCase()
    }
  }

  // 翻訳が見つからない場合は、日本語をローマ字に変換（簡易版）
  return japaneseToRomaji(japaneseName)
}

// 簡易的な日本語からローマ字への変換
function japaneseToRomaji(text: string): string {
  const hiraganaToRomaji: Record<string, string> = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n'
  }

  let result = text
    .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\w\s]/g, '') // ひらがな、カタカナ、漢字、英数字、スペース以外を除去
    .replace(/\s+/g, '_') // スペースをアンダースコアに
    .toLowerCase()

  // ひらがなをローマ字に変換（簡易版）
  for (const [hiragana, romaji] of Object.entries(hiraganaToRomaji)) {
    result = result.replace(new RegExp(hiragana, 'g'), romaji)
  }

  return result
}

// 変数名の妥当性をチェック
export function isValidVariableName(name: string): boolean {
  // 英数字とアンダースコアのみ、数字で始まらない
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

// 変数名を正規化
export function normalizeVariableName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_') // 英数字とアンダースコア以外をアンダースコアに
    .replace(/_+/g, '_') // 連続するアンダースコアを1つに
    .replace(/^_|_$/g, '') // 先頭と末尾のアンダースコアを除去
    .toLowerCase()
}
