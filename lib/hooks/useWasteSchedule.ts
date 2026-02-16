'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { HikoneWasteMaster } from '@/components/home/WasteScheduleCard'

// 必要なカラムのみを指定（パフォーマンス最適化）
const WASTE_SCHEDULE_COLUMNS = [
  'area_key',
  'burnable',
  'cans_and_metal',
  'glass_bottles',
  'pet_bottles',
  'landfill_waste'
].join(',')

// エリア名を正規化する関数（空白除去、全角・半角統一など）
const normalizeAreaName = (areaName: string): string => {
  return areaName
    .trim()
    .replace(/\s+/g, '') // 空白を除去
    .replace(/[\u30fb･]/g, '\u30fb') // 全角・半角の中点を統一
}

// エリア名から検索キーワードを生成する関数
const generateSearchKeywords = (areaName: string): string[] => {
  const normalized = normalizeAreaName(areaName)
  const keywords: string[] = [normalized] // 元の文字列
  
  // 「・」で分割して、各部分も検索キーワードに追加
  const parts = normalized.split('\u30fb')
  keywords.push(...parts) // 各部分を追加
  
  // 最初の部分（例：「城南」）を優先的に使用
  if (parts.length > 0 && parts[0]) {
    keywords.push(parts[0])
  }
  
  return keywords.filter((k, i, arr) => arr.indexOf(k) === i) // 重複除去
}

// SWR用のフェッチャー関数
// プロフィールの selected_area や detail_area から正しい area_key を導き出す
const fetchWasteSchedule = async (areaKey: string): Promise<HikoneWasteMaster | null> => {
  if (!areaKey) return null
  
  // ★ 3秒でタイムアウト（モバイルでのハング防止）
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 3000)
  )
  
  const fetchPromise = (async (): Promise<HikoneWasteMaster | null> => {
    try {
      // ★ Supabase テーブル未作成のため一時的にコメントアウトしてnullを返す
      /*
      // 検索キーワードを生成
      const searchKeywords = generateSearchKeywords(areaKey)
      
      // 1. area_key で完全一致検索（正規化後の文字列で検索）
      const normalizedAreaKey = normalizeAreaName(areaKey)
      const { data: exactMatch, error: exactError } = await supabase
        .from('hikone_waste_master')
        .select(WASTE_SCHEDULE_COLUMNS)
        .eq('area_key', normalizedAreaKey)
        .single()
      
      if (exactMatch && !exactError) return exactMatch as HikoneWasteMaster
      
      // 2. area_key で部分一致検索（各キーワードで検索）
      for (const keyword of searchKeywords) {
        if (!keyword || keyword.trim() === '') continue
        
        const { data: partialMatch, error: partialError } = await supabase
          .from('hikone_waste_master')
          .select(WASTE_SCHEDULE_COLUMNS)
          .ilike('area_key', `%${keyword}%`)
          .limit(1)
          .maybeSingle()
        
        if (partialMatch && !partialError) return partialMatch as HikoneWasteMaster
      }
      
      // 3. area_key で逆方向の部分一致検索（DBのarea_keyがプロフィールのエリア名を含むかチェック）
      // 例：プロフィールが「城南」で、DBが「城南・城陽・若葉・高宮」の場合
      for (const keyword of searchKeywords) {
        if (!keyword || keyword.trim() === '') continue
        
        // DBのarea_keyがプロフィールのキーワードを含むかチェック
        const { data: reverseMatch, error: reverseError } = await supabase
          .from('hikone_waste_master')
          .select(WASTE_SCHEDULE_COLUMNS)
          .ilike('area_key', `%${keyword}%`)
          .limit(1)
          .maybeSingle()
        
        if (reverseMatch && !reverseError) return reverseMatch as HikoneWasteMaster
      }
      
      // 4. 全件取得して、手動でマッチング（最後の手段）
      const { data: allAreas, error: allError } = await supabase
        .from('hikone_waste_master')
        .select(WASTE_SCHEDULE_COLUMNS)
        .limit(20) // 彦根市のエリア数は限られているので20件で十分
      
      if (allAreas && !allError) {
        // 各エリア名とプロフィールのエリア名を比較
        for (const area of allAreas) {
          const dbAreaKey = normalizeAreaName(area.area_key || '')
          const profileAreaKey = normalizedAreaKey
          
          // 完全一致
          if (dbAreaKey === profileAreaKey) return area as HikoneWasteMaster
          
          // 相互に含まれるかチェック
          if (dbAreaKey.includes(profileAreaKey) || profileAreaKey.includes(dbAreaKey)) return area as HikoneWasteMaster
          
          // キーワードのいずれかが含まれるかチェック
          for (const keyword of searchKeywords) {
            if (dbAreaKey.includes(keyword) || keyword.includes(dbAreaKey)) return area as HikoneWasteMaster
          }
        }
      }
      
      // 5. 最終フォールバック: 彦根市のデフォルトエリアを返す
      try {
        const { data: fallbackMatch, error: fallbackError } = await supabase
          .from('hikone_waste_master')
          .select(WASTE_SCHEDULE_COLUMNS)
          .limit(1)
          .maybeSingle()
        
        if (fallbackMatch && !fallbackError) return fallbackMatch as HikoneWasteMaster
      } catch {
        // フォールバック検索失敗時は null を返す
      }
      */
      
      return null
    } catch {
      return null
    }
  })()
  
  // タイムアウトかフェッチの早い方を返す
  return Promise.race([fetchPromise, timeoutPromise])
}

/**
 * ゴミ収集スケジュールをSWRでキャッシュして取得するカスタムフック
 * 
 * @param areaKey - ユーザーが選択したエリアキー（例: "城南/城陽..."）
 * @returns { data, error, isLoading, mutate }
 * 
 * キャッシュ戦略:
 * - revalidateOnFocus: false - タブ切り替え時に再取得しない
 * - revalidateOnReconnect: false - 再接続時に再取得しない
 * - dedupingInterval: 3600000 (1時間) - 同じキーのリクエストを1時間重複排除
 * - staleTime: Infinity - キャッシュは常に最新として扱う（手動で更新するまで）
 */
export function useWasteSchedule(areaKey: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    // キーがnullの場合はフェッチしない
    areaKey ? `waste-schedule:${areaKey}` : null,
    () => fetchWasteSchedule(areaKey!),
    {
      // キャッシュ最適化オプション（スマホで画面切り替え時の再ロード防止）
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
      revalidateIfStale: false,      // staleデータでも自動再取得しない
      // エラー時のリトライ
      errorRetryCount: 2,
      errorRetryInterval: 3000
    }
  )
  
  return {
    wasteSchedule: data ?? null,
    error,
    isLoading,
    // 手動で再取得したい場合に使用
    refetch: () => mutate()
  }
}

/**
 * プロフィール更新後にキャッシュを更新するためのヘルパー
 */
export async function prefetchWasteSchedule(areaKey: string): Promise<HikoneWasteMaster | null> {
  return fetchWasteSchedule(areaKey)
}
