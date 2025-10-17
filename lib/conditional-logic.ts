import { ConditionalLogic, ConditionalRule, ConditionalEvaluation, QuestionCondition } from '@/types/conditional'

/**
 * 条件分岐を評価する
 */
export function evaluateConditionalLogic(
  conditions: ConditionalLogic,
  answers: Record<string, any>
): ConditionalEvaluation {
  if (!conditions.enabled || conditions.rules.length === 0) {
    return { shouldShow: true, matchedRules: [] }
  }

  const matchedRules: string[] = []
  const results: boolean[] = []

  for (const rule of conditions.rules) {
    const result = evaluateRule(rule, answers)
    results.push(result)
    if (result) {
      matchedRules.push(rule.id)
    }
  }

  let shouldShow: boolean
  if (conditions.showIf === 'all') {
    shouldShow = results.every(result => result)
  } else {
    shouldShow = results.some(result => result)
  }

  return { shouldShow, matchedRules }
}


/**
 * 個別のルールを評価する
 */
function evaluateRule(rule: ConditionalRule, answers: Record<string, any>): boolean {
  const answer = answers[rule.questionId]
  
  if (answer === undefined || answer === null) {
    return rule.operator === 'is_empty'
  }

  switch (rule.operator) {
    case 'equals':
      return answer === rule.value
    case 'not_equals':
      return answer !== rule.value
    case 'contains':
      return String(answer).includes(String(rule.value))
    case 'not_contains':
      return !String(answer).includes(String(rule.value))
    case 'greater_than':
      return Number(answer) > Number(rule.value)
    case 'less_than':
      return Number(answer) < Number(rule.value)
    case 'is_empty':
      return !answer || String(answer).trim() === ''
    case 'is_not_empty':
      return answer && String(answer).trim() !== ''
    case 'is_uploaded':
      // ファイルアップロードの場合、ファイルが存在するかチェック
      return answer && (Array.isArray(answer) ? answer.length > 0 : answer)
    case 'is_not_uploaded':
      // ファイルアップロードの場合、ファイルが存在しないかチェック
      return !answer || (Array.isArray(answer) ? answer.length === 0 : !answer)
    case 'is_acquired':
      // 位置情報の場合、座標が存在するかチェック
      return answer && (answer.latitude !== undefined && answer.longitude !== undefined)
    case 'is_not_acquired':
      // 位置情報の場合、座標が存在しないかチェック
      return !answer || (answer.latitude === undefined || answer.longitude === undefined)
    default:
      return false
  }
}

/**
 * 質問の条件分岐を評価する
 */
export function evaluateQuestionConditions(
  questionId: string,
  conditions: ConditionalLogic,
  answers: Record<string, any>
): boolean {
  const evaluation = evaluateConditionalLogic(conditions, answers)
  return evaluation.shouldShow
}

/**
 * 条件分岐の説明文を生成する
 */
export function generateConditionDescription(conditions: ConditionalLogic): string {
  if (!conditions.enabled || conditions.rules.length === 0) {
    return '常に表示'
  }

  const ruleDescriptions = conditions.rules.map(rule => {
    const operatorText = getOperatorText(rule.operator)
    return `${rule.questionId} ${operatorText} ${rule.value}`
  })

  const logicText = conditions.showIf === 'all' ? 'かつ' : 'または'
  return ruleDescriptions.join(` ${logicText} `)
}

/**
 * 演算子のテキストを取得する
 */
function getOperatorText(operator: string): string {
  const operatorMap: Record<string, string> = {
    'equals': 'が',
    'not_equals': 'がでない',
    'contains': 'に含む',
    'not_contains': 'に含まない',
    'greater_than': 'より大きい',
    'less_than': 'より小さい',
    'is_empty': 'が空',
    'is_not_empty': 'が空でない',
    'is_uploaded': 'がアップロードされている',
    'is_not_uploaded': 'がアップロードされていない',
    'is_acquired': 'が取得されている',
    'is_not_acquired': 'が取得されていない'
  }
  return operatorMap[operator] || operator
}

/**
 * 利用可能な演算子のリスト
 */
export const AVAILABLE_OPERATORS = [
  { value: 'equals', label: 'が' },
  { value: 'not_equals', label: 'がでない' },
  { value: 'contains', label: 'に含む' },
  { value: 'not_contains', label: 'に含まない' },
  { value: 'greater_than', label: 'より大きい' },
  { value: 'less_than', label: 'より小さい' },
  { value: 'is_empty', label: 'が空' },
  { value: 'is_not_empty', label: 'が空でない' }
] as const
