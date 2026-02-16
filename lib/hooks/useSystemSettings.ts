import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface SystemSettings {
  id: string
  base_point_rate: number // 1kmあたりのポイント単価
  monthly_point_limit: number // 月間発行上限
  updated_at: string
}

/**
 * system_settingsテーブルから設定を取得するカスタムフック
 */
export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true
    
    async function fetchSettings() {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('system_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle() // single()の代わりにmaybeSingle()を使用（レコードがなくてもエラーにならない）

        // コンポーネントがアンマウントされた場合は処理を中断
        if (!isMounted) return

        if (fetchError) {
          // 403/406エラー（権限エラー）の場合はデフォルト値を使用
          if (fetchError.code === 'PGRST301' || fetchError.code === 'PGRST116' || 
              fetchError.message?.includes('403') || fetchError.message?.includes('406')) {
            console.log('⚠️ [SystemSettings] 設定レコードが存在しないか、アクセス権限がありません。デフォルト値を使用します。')
            if (isMounted) {
              setSettings({
                id: 'default',
                base_point_rate: 15,
                monthly_point_limit: 100000,
                updated_at: new Date().toISOString()
              })
            }
            setLoading(false)
            return
          }
          throw fetchError
        }

        if (data) {
          if (isMounted) {
            setSettings(data as SystemSettings)
          }
        } else {
          // データが存在しない場合はデフォルト値を使用
          console.log('⚠️ [SystemSettings] 設定レコードが存在しません。デフォルト値を使用します。')
          if (isMounted) {
            setSettings({
              id: 'default',
              base_point_rate: 15,
              monthly_point_limit: 100000,
              updated_at: new Date().toISOString()
            })
          }
        }
      } catch (err) {
        console.error('❌ [SystemSettings] 設定取得エラー:', err)
        if (isMounted) {
          setError(err as Error)
          // エラー時もデフォルト値を使用
          setSettings({
            id: 'default',
            base_point_rate: 15,
            monthly_point_limit: 100000,
            updated_at: new Date().toISOString()
          })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchSettings()

    // クリーンアップ関数
    return () => {
      isMounted = false
    }
  }, [])

  /**
   * base_point_rateを更新する関数
   */
  const updateBasePointRate = async (newRate: number): Promise<boolean> => {
    try {
      // 既存のレコードがあるか確認
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      let result
      if (existing) {
        // 既存レコードを更新
        const { error: updateError } = await supabase
          .from('system_settings')
          .update({
            base_point_rate: newRate,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
        result = { base_point_rate: newRate, updated_at: new Date().toISOString() }
      } else {
        // 新規レコードを作成
        const { data: insertData, error: insertError } = await supabase
          .from('system_settings')
          .insert({
            base_point_rate: newRate,
            monthly_point_limit: settings?.monthly_point_limit || 100000,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) throw insertError
        result = insertData
      }

      // ローカルステートを更新
      if (settings) {
        setSettings({
          ...settings,
          base_point_rate: newRate,
          updated_at: result.updated_at
        })
      }

      return true
    } catch (err) {
      console.error('❌ [SystemSettings] 更新エラー:', err)
      setError(err as Error)
      return false
    }
  }

  return {
    settings,
    loading,
    error,
    updateBasePointRate
  }
}
