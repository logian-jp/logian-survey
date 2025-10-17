'use client'

import { useState, useEffect } from 'react'
import { ConditionalLogic, ConditionalRule, ConditionalRuleUI } from '@/types/conditional'

interface ConditionalLogicEditorProps {
  conditions: ConditionalLogic
  onChange: (conditions: ConditionalLogic) => void
  availableQuestions: Array<{
    id: string
    title: string
    type: string
  }>
  currentQuestionId: string
}

export default function ConditionalLogicEditor({
  conditions,
  onChange,
  availableQuestions,
  currentQuestionId
}: ConditionalLogicEditorProps) {
  const [rules, setRules] = useState<ConditionalRuleUI[]>([])

  // 利用可能な質問をフィルタリング（現在の質問より前の質問のみ）
  const filteredQuestions = availableQuestions.filter(q => q.id !== currentQuestionId)

  // 質問タイプに応じた演算子を取得
  const getOperatorOptions = (questionType: string) => {
    switch (questionType) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'EMAIL':
      case 'PHONE':
        return [
          { value: 'equals', label: '等しい' },
          { value: 'not_equals', label: '等しくない' },
          { value: 'contains', label: '含む' },
          { value: 'not_contains', label: '含まない' },
          { value: 'is_empty', label: '空である' },
          { value: 'is_not_empty', label: '空でない' }
        ]
      case 'NUMBER':
        return [
          { value: 'equals', label: '等しい' },
          { value: 'not_equals', label: '等しくない' },
          { value: 'greater_than', label: 'より大きい' },
          { value: 'less_than', label: 'より小さい' },
          { value: 'is_empty', label: '空である' },
          { value: 'is_not_empty', label: '空でない' }
        ]
      case 'RATING':
        return [
          { value: 'equals', label: '等しい' },
          { value: 'not_equals', label: '等しくない' },
          { value: 'greater_than', label: 'より大きい' },
          { value: 'less_than', label: 'より小さい' },
          { value: 'is_empty', label: '空である' },
          { value: 'is_not_empty', label: '空でない' }
        ]
      case 'DATE':
        return [
          { value: 'equals', label: '等しい' },
          { value: 'not_equals', label: '等しくない' },
          { value: 'greater_than', label: 'より後' },
          { value: 'less_than', label: 'より前' },
          { value: 'is_empty', label: '空である' },
          { value: 'is_not_empty', label: '空でない' }
        ]
      case 'MULTIPLE_CHOICE':
      case 'CHECKBOX':
        return [
          { value: 'equals', label: '等しい' },
          { value: 'not_equals', label: '等しくない' },
          { value: 'contains', label: '含む' },
          { value: 'not_contains', label: '含まない' },
          { value: 'is_empty', label: '空である' },
          { value: 'is_not_empty', label: '空でない' }
        ]
      case 'FILE_UPLOAD':
        return [
          { value: 'is_uploaded', label: 'ファイルがアップロードされている' },
          { value: 'is_not_uploaded', label: 'ファイルがアップロードされていない' }
        ]
      case 'LOCATION':
        return [
          { value: 'is_acquired', label: '位置情報が取得されている' },
          { value: 'is_not_acquired', label: '位置情報が取得されていない' }
        ]
      default:
        return [
          { value: 'equals', label: '等しい' },
          { value: 'not_equals', label: '等しくない' },
          { value: 'is_empty', label: '空である' },
          { value: 'is_not_empty', label: '空でない' }
        ]
    }
  }

  useEffect(() => {
    if (conditions.rules) {
      const ruleUIs = conditions.rules.map(rule => ({
        id: rule.id,
        questionId: rule.questionId,
        questionTitle: availableQuestions.find(q => q.id === rule.questionId)?.title || '',
        operator: rule.operator,
        value: String(rule.value),
        logic: rule.logic
      }))
      setRules(ruleUIs)
    }
  }, [conditions.rules, availableQuestions])

  const addRule = () => {
    const newRule: ConditionalRuleUI = {
      id: `rule_${Date.now()}`,
      questionId: filteredQuestions[0]?.id || '',
      questionTitle: filteredQuestions[0]?.title || '',
      operator: 'equals',
      value: '',
      logic: 'AND'
    }
    const newRules = [...rules, newRule]
    setRules(newRules)
    updateConditions(newRules)
  }

  const removeRule = (ruleId: string) => {
    const newRules = rules.filter(rule => rule.id !== ruleId)
    setRules(newRules)
    updateConditions(newRules)
  }

  const updateRule = (ruleId: string, field: keyof ConditionalRuleUI, value: any) => {
    const newRules = rules.map(rule => {
      if (rule.id === ruleId) {
        const updatedRule = { ...rule, [field]: value }
        
        // 質問が変更された場合、質問タイトルも更新
        if (field === 'questionId') {
          const question = availableQuestions.find(q => q.id === value)
          updatedRule.questionTitle = question?.title || ''
        }
        
        return updatedRule
      }
      return rule
    })
    setRules(newRules)
    updateConditions(newRules)
  }

  const updateConditions = (newRules: ConditionalRuleUI[]) => {
    const conditionalRules: ConditionalRule[] = newRules.map(rule => ({
      id: rule.id,
      questionId: rule.questionId,
      operator: rule.operator as any,
      value: rule.value,
      logic: rule.logic
    }))

    onChange({
      enabled: conditions.enabled,
      rules: conditionalRules,
      showIf: conditions.showIf
    })
  }

  const toggleEnabled = () => {
    onChange({
      enabled: !conditions.enabled,
      rules: conditions.rules,
      showIf: conditions.showIf
    })
  }

  const updateShowIf = (showIf: 'all' | 'any') => {
    onChange({
      enabled: conditions.enabled,
      rules: conditions.rules,
      showIf
    })
  }


  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">条件分岐設定</h4>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={conditions.enabled}
            onChange={toggleEnabled}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">条件分岐を有効にする</span>
        </label>
      </div>

      {conditions.enabled && (
        <div className="space-y-4">
          {/* 表示条件の設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              表示条件
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="showIf"
                  value="all"
                  checked={conditions.showIf === 'all'}
                  onChange={() => updateShowIf('all')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">すべての条件を満たす場合</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="showIf"
                  value="any"
                  checked={conditions.showIf === 'any'}
                  onChange={() => updateShowIf('any')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">いずれかの条件を満たす場合</span>
              </label>
            </div>
          </div>

          {/* 条件ルールの一覧 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">条件ルール</label>
              <button
                type="button"
                onClick={addRule}
                className="text-sm text-primary hover:text-primary-foreground bg-primary px-3 py-1 rounded-md"
              >
                + 条件を追加
              </button>
            </div>

            {rules.length === 0 ? (
              <p className="text-sm text-gray-500">条件が設定されていません</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="bg-white border border-gray-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        条件 {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* 質問選択 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          質問
                        </label>
                        <select
                          value={rule.questionId}
                          onChange={(e) => updateRule(rule.id, 'questionId', e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-primary focus:border-primary"
                        >
                          <option value="">質問を選択</option>
                          {filteredQuestions.map(question => (
                            <option key={question.id} value={question.id}>
                              {question.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 演算子選択 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          演算子
                        </label>
                        <select
                          value={rule.operator}
                          onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-primary focus:border-primary"
                        >
                          {(() => {
                            const selectedQuestion = availableQuestions.find(q => q.id === rule.questionId)
                            const operatorOptions = selectedQuestion ? getOperatorOptions(selectedQuestion.type) : []
                            return operatorOptions.map(op => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))
                          })()}
                        </select>
                      </div>

                      {/* 値入力（特殊な演算子の場合は非表示） */}
                      {(() => {
                        const selectedQuestion = availableQuestions.find(q => q.id === rule.questionId)
                        const isSpecialOperator = selectedQuestion && 
                          (selectedQuestion.type === 'FILE_UPLOAD' || selectedQuestion.type === 'LOCATION') &&
                          (rule.operator === 'is_uploaded' || rule.operator === 'is_not_uploaded' || 
                           rule.operator === 'is_acquired' || rule.operator === 'is_not_acquired')
                        
                        if (isSpecialOperator) {
                          return null
                        }
                        
                        return (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              値
                            </label>
                            <input
                              type="text"
                              value={rule.value}
                              onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                              placeholder="値を入力"
                              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-primary focus:border-primary"
                            />
                          </div>
                        )
                      })()}

                      {/* 論理演算子 */}
                      {index > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            論理演算子
                          </label>
                          <select
                            value={rule.logic}
                            onChange={(e) => updateRule(rule.id, 'logic', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-primary focus:border-primary"
                          >
                            <option value="AND">かつ</option>
                            <option value="OR">または</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 条件の説明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>条件分岐の説明:</strong><br />
              この質問は、設定した条件を満たす場合のみ表示されます。
              条件を満たさない場合は、回答者はこの質問を見ることができません。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
