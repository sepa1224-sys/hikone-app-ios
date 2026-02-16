'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// 自治体統計情報の型
export interface MunicipalityStats {
  municipalityName: string      // 自治体名
  population: number            // 最新人口
  registeredUsers: number       // アプリ登録者数
  totalAppUsers: number         // アプリ全体の登録者数
  mascotName: string | null     // マスコット名
  populationUpdatedAt: string | null  // 人口更新日
}

// デフォルトの人口値
const DEFAULT_POPULATIONS: Record<string, number> = {
  '彦根市': 110489,
  '大津市': 344900,
  '長浜市': 112500,
  '草津市': 148200,
  '近江八幡市': 80500,
  '守山市': 86200,
  '栗東市': 71800,
  '甲賀市': 86800,
  '野洲市': 51200,
  '湖南市': 54800,
  '東近江市': 111500,
  '米原市': 36200,
  '高島市': 44500,
  '日野町': 20500,
  '竜王町': 11800,
  '愛荘町': 20800,
  '豊郷町': 7100,
  '甲良町': 6400,
  '多賀町': 7000,
  '敦賀市': 63500,
}

// フォールバック値（何があっても最低限これを表示する）
const FALLBACK_STATS: MunicipalityStats = {
  municipalityName: '彦根市',
  population: 110489,
  registeredUsers: 0,
  totalAppUsers: 0,
  mascotName: 'ひこにゃん',
  populationUpdatedAt: null
}

function normalizeCity(city: string): string {
  const trimmed = city.trim().replace(/[\s　]+/g, '')
  if (!trimmed.match(/[市町村区]$/)) {
    return trimmed + '市'
  }
  return trimmed
}

/**
 * 実際のデータ取得ロジック
 */
const fetchMunicipalityStats = async (city: string | null, currentUserId?: string | null): Promise<MunicipalityStats> => {
  try {
    // ★重要: 3秒でタイムアウトさせる競合プロミスを作成
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000)
    );

    // DB取得処理本体
    const fetchPromise = (async () => {
      const normalizedCity = city ? normalizeCity(city) : '彦根市'
      
      // 1. 基本的な統計情報を取得（存在チェックなどは簡略化）
      // もし municipalities テーブルやカラムがない場合のエラーをキャッチして無視する
      let municipalityData: any = null;
      /* ★ Supabase テーブル未作成のため一時的にコメントアウト
      try {
        const { data, error } = await supabase
          .from('municipalities')
          .select('name, population, mascot_name, population_updated_at')
          .eq('name', normalizedCity)
          .maybeSingle();
        if (!error) municipalityData = data;
      } catch (e) {
        console.error('Munis fetch error (ignored):', e);
      }
      */

      // 2. 登録者数を取得
      // ※ここで "column city does not exist" になる可能性が高いため try-catch を強化
      let hikoneUsers = 0;
      let totalUsers = 0;
      
      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('city', normalizedCity);
        hikoneUsers = count ?? 0;
      } catch (e) {
        console.error('Profiles city count error (ignored):', e);
      }

      try {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        totalUsers = count ?? 0;
      } catch (e) {
        console.error('Total profiles count error (ignored):', e);
      }

      // データの結合
      const defaultPop = DEFAULT_POPULATIONS[normalizedCity] || DEFAULT_POPULATIONS['彦根市'];
      
      return {
        municipalityName: normalizedCity,
        population: municipalityData?.population ?? defaultPop,
        registeredUsers: hikoneUsers,
        totalAppUsers: totalUsers,
        mascotName: municipalityData?.mascot_name ?? 'ひこにゃん',
        populationUpdatedAt: municipalityData?.population_updated_at ?? null
      } as MunicipalityStats;
    })();

    // タイムアウトかデータ取得の早い方を返す
    return await Promise.race([fetchPromise, timeoutPromise]);

  } catch {
    return FALLBACK_STATS;
  }
}

export function useMunicipalityStats(city: string | null, currentUserId?: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    `municipality-stats:${city || 'default'}`,
    () => fetchMunicipalityStats(city, currentUserId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      refreshInterval: 0,
      fallbackData: FALLBACK_STATS,
    }
  );

  return {
    stats: data || FALLBACK_STATS,
    isLoading,
    error,
    refetch: mutate
  }
}

export function formatPopulationDisplay(stats: MunicipalityStats): string {
  const registered = (stats.registeredUsers || 0).toLocaleString()
  const population = (stats.population || 0).toLocaleString()
  return `${registered}人 / ${population}人（${stats.municipalityName}）`
}

export function calculateRegistrationRate(stats: MunicipalityStats): number {
  if (!stats.population || stats.population <= 0) return 0
  return (stats.registeredUsers / stats.population) * 100
}
