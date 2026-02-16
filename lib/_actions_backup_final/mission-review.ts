'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Admin機能なので、Service Role Keyが必須
if (!supabaseServiceKey) {
  console.error('🚨 [Admin] SUPABASE_SERVICE_ROLE_KEY is missing.')
}

// 管理者権限（service_role）でクライアントを作成
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function approveSubmission(submissionId: string, userId: string, points: number, missionTitle: string) {
  try {
    if (!supabaseServiceKey) throw new Error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing')

    // 1. ステータス更新
    const { error: updateError } = await supabase
      .from('mission_submissions')
      .update({ status: 'approved' })
      .eq('id', submissionId)

    if (updateError) throw updateError

    // 2. ポイント付与
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()

    const currentPoints = profile?.points || 0
    const newPoints = currentPoints + points

    const { error: pointError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId)

    if (pointError) throw pointError

    // 3. 履歴記録
    await supabase
      .from('point_history')
      .insert({
        user_id: userId,
        amount: points,
        reason: `ミッション完了(承認): ${missionTitle}`,
        type: 'earned',
        created_at: new Date().toISOString()
      })

    return { success: true }
  } catch (error: any) {
    console.error('Approve Error:', error)
    return { success: false, error: error.message }
  }
}

export async function rejectSubmission(submissionId: string, reason: string) {
  try {
    if (!supabaseServiceKey) throw new Error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing')

    const { error } = await supabase
      .from('mission_submissions')
      .update({ 
        status: 'rejected',
        reviewer_comment: reason
      })
      .eq('id', submissionId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Reject Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getPendingSubmissions() {
  try {
    if (!supabaseServiceKey) {
      console.error('🚨 [Admin] Cannot fetch submissions without service role key')
      return []
    }

    // 1. まずsubmissionsテーブル単体で取得（JOINしない）
    // これにより PGRST200 エラー（リレーションシップが見つからない）を回避
    const { data: submissions, error: fetchError } = await supabase
      .from('mission_submissions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Fetch Error:', fetchError)
      return []
    }

    if (!submissions || submissions.length === 0) {
      console.log('✅ [Admin] No pending submissions found.')
      return []
    }

    console.log(`✅ [Admin] Fetched ${submissions.length} pending submissions raw data`)

    // 2. 必要なIDを抽出
    const userIds = Array.from(new Set(submissions.map(s => s.user_id).filter(Boolean)))
    const missionIds = Array.from(new Set(submissions.map(s => s.mission_id).filter(Boolean)))

    // 3. 関連データを並行して取得
    const [profilesResult, missionsResult] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds),
      supabase.from('monthly_missions').select('id, title, points').in('id', missionIds)
    ])

    if (profilesResult.error) console.error('Profiles Fetch Error:', profilesResult.error)
    if (missionsResult.error) console.error('Missions Fetch Error:', missionsResult.error)

    const profiles = profilesResult.data || []
    const missions = missionsResult.data || []

    // 4. マップ作成（検索効率化）
    const userMap = new Map(profiles.map(p => [p.id, p]))
    const missionMap = new Map(missions.map(m => [m.id, m]))

    // 5. データ結合と署名付きURL生成
    const combinedData = await Promise.all(submissions.map(async (sub) => {
      // ユーザーとミッション情報を結合
      const user = userMap.get(sub.user_id) || { full_name: 'Unknown', avatar_url: null }
      const mission = missionMap.get(sub.mission_id) || { title: 'Unknown', points: 0 }
      
      const enrichedSub = {
        ...sub,
        user,
        mission
      }

      // 画像URLを署名付きURLに変換する処理
      if (enrichedSub.image_url) {
        try {
          // 正規表現で mission-photos/ より前の部分（バケット名含む）を一括削除
          const path = enrichedSub.image_url.replace(/^.*mission-photos\//, '').split('?')[0]
          
          if (path && path.length > 0) {
             const { data: signedData, error: signedError } = await supabase
               .storage
               .from('mission-photos')
               .createSignedUrl(path, 60 * 60)

             if (!signedError && signedData?.signedUrl) {
               return { ...enrichedSub, image_url: signedData.signedUrl }
             } else {
               console.warn(`Failed to sign URL for path: ${path}`, signedError)
             }
          }
        } catch (e) {
          console.error('Signed URL generation failed for:', enrichedSub.id, e)
        }
      }
      return enrichedSub
    }))

    return combinedData
  } catch (error) {
    console.error('getPendingSubmissions Error:', error)
    return []
  }
}
