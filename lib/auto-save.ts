import debounce from 'lodash/debounce.js'
import { useState, useEffect, useMemo } from 'react'

interface AutoSaveOptions {
  delay?: number // デバウンス時間（ミリ秒）
  onSave: (data: any) => Promise<void>
  onError?: (error: Error) => void
  onSuccess?: () => void
}

export class AutoSaveManager {
  private debouncedSave: (data: any) => void
  private lastSavedData: any = null
  private isSaving = false

  constructor(options: AutoSaveOptions) {
    this.debouncedSave = debounce(async (data: any) => {
      if (this.isSaving) return
      
      try {
        this.isSaving = true
        await options.onSave(data)
        this.lastSavedData = data
        options.onSuccess?.()
      } catch (error) {
        console.error('Auto-save failed:', error)
        options.onError?.(error as Error)
      } finally {
        this.isSaving = false
      }
    }, options.delay || 2000)
  }

  // データを保存キューに追加
  save(data: any) {
    this.debouncedSave(data)
  }

  // 強制的に保存（デバウンスを無視）
  async forceSave(data: any) {
    this.debouncedSave.cancel()
    await this.debouncedSave.flush()
  }

  // 最後に保存されたデータと現在のデータが同じかチェック
  hasUnsavedChanges(currentData: any): boolean {
    return JSON.stringify(currentData) !== JSON.stringify(this.lastSavedData)
  }

  // 保存中かどうか
  getSavingStatus(): boolean {
    return this.isSaving
  }

  // デバウンスをキャンセル
  cancel() {
    this.debouncedSave.cancel()
  }
}

// React用のフック
export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options?: {
    delay?: number
    enabled?: boolean
    onError?: (error: Error) => void
    onSuccess?: () => void
  }
) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const debouncedSave = useMemo(
    () => debounce(async (data: T) => {
      if (!options?.enabled) return
      
      try {
        setIsSaving(true)
        setError(null)
        await saveFunction(data)
        setLastSaved(new Date())
        options?.onSuccess?.()
      } catch (err) {
        const error = err as Error
        setError(error)
        options?.onError?.(error)
      } finally {
        setIsSaving(false)
      }
    }, options?.delay || 2000),
    [saveFunction, options?.delay, options?.enabled]
  )

  useEffect(() => {
    if (options?.enabled !== false) {
      debouncedSave(data)
    }

    return () => {
      debouncedSave.cancel()
    }
  }, [data, debouncedSave, options?.enabled])

  return {
    isSaving,
    lastSaved,
    error,
    forceSave: () => debouncedSave.flush()
  }
}
