// 条件分岐の型定義

export interface ConditionalRule {
  id: string
  questionId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty' | 'is_uploaded' | 'is_not_uploaded' | 'is_acquired' | 'is_not_acquired'
  value: string | number | boolean
  logic: 'AND' | 'OR'
}

export interface ConditionalLogic {
  enabled: boolean
  rules: ConditionalRule[]
  showIf: 'all' | 'any' // すべての条件を満たす場合に表示 / いずれかの条件を満たす場合に表示
}

export interface QuestionCondition {
  questionId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty' | 'is_uploaded' | 'is_not_uploaded' | 'is_acquired' | 'is_not_acquired'
  value: string | number | boolean
}

// 条件分岐の評価結果
export interface ConditionalEvaluation {
  shouldShow: boolean
  matchedRules: string[]
}

// 条件分岐の設定UI用
export interface ConditionalRuleUI {
  id: string
  questionId: string
  questionTitle: string
  operator: string
  value: string
  logic: 'AND' | 'OR'
}
