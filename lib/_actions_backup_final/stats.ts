'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface UniversityStats {
  universityName: string
  totalCount: number
  gradeBreakdown: {
    grade: string
    count: number
  }[]
}

export async function getUniversityStats(universityName: string): Promise<{ success: boolean; data?: UniversityStats; error?: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. 大学名が一致するプロファイルを全取得
    // countだけ取得するのではなく、内訳計算のためにデータも取得
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('grade')
      .eq('university_name', universityName)

    if (error) {
      console.error('Error fetching university stats:', error)
      return { success: false, error: error.message }
    }

    if (!profiles) {
      return { success: true, data: { universityName, totalCount: 0, gradeBreakdown: [] } }
    }

    const totalCount = profiles.length

    // 2. 学年ごとの内訳を計算
    const gradeCounts: Record<string, number> = {}
    profiles.forEach(profile => {
      const grade = profile.grade || '不明'
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1
    })

    const gradeBreakdown = Object.entries(gradeCounts).map(([grade, count]) => ({
      grade,
      count
    })).sort((a, b) => {
      // 学年順にソート（簡易的）
      if (a.grade === '不明') return 1
      if (b.grade === '不明') return -1
      return a.grade.localeCompare(b.grade)
    })

    return {
      success: true,
      data: {
        universityName,
        totalCount,
        gradeBreakdown
      }
    }

  } catch (err: any) {
    console.error('Unexpected error in getUniversityStats:', err)
    return { success: false, error: err.message }
  }
}
