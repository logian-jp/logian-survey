'use client'

import { useState, useEffect } from 'react'
import { translateVariableName, normalizeVariableName, isValidVariableName } from '@/lib/variable-translation'

interface VariableNameTranslatorProps {
  originalName: string
  onNameChange: (newName: string) => void
  disabled?: boolean
}

export default function VariableNameTranslator({ 
  originalName, 
  onNameChange, 
  disabled = false 
}: VariableNameTranslatorProps) {
  const [translatedName, setTranslatedName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [customName, setCustomName] = useState('')

  useEffect(() => {
    if (originalName) {
      const translated = translateVariableName(originalName)
      setTranslatedName(translated)
      setCustomName(translated)
    }
  }, [originalName])

  const handleAutoTranslate = () => {
    const translated = translateVariableName(originalName)
    setTranslatedName(translated)
    setCustomName(translated)
    onNameChange(translated)
    setIsEditing(false)
  }

  const handleCustomEdit = () => {
    setIsEditing(true)
  }

  const handleSaveCustom = () => {
    const normalized = normalizeVariableName(customName)
    if (isValidVariableName(normalized)) {
      setTranslatedName(normalized)
      onNameChange(normalized)
      setIsEditing(false)
    } else {
      alert('無効な変数名です。英数字とアンダースコアのみ使用できます。')
    }
  }

  const handleCancel = () => {
    setCustomName(translatedName)
    setIsEditing(false)
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="変数名を入力"
              disabled={disabled}
            />
            <button
              onClick={handleSaveCustom}
              disabled={disabled}
              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:opacity-50"
            >
              保存
            </button>
            <button
              onClick={handleCancel}
              disabled={disabled}
              className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
              {translatedName}
            </span>
            <button
              onClick={handleCustomEdit}
              disabled={disabled}
              className="text-blue-500 hover:text-blue-700 text-xs"
            >
              編集
            </button>
          </div>
        )}
      </div>
      
      {!isEditing && (
        <button
          onClick={handleAutoTranslate}
          disabled={disabled}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
        >
          自動翻訳
        </button>
      )}
    </div>
  )
}
