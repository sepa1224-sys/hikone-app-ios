'use server'

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 管理者権限（service_role）でクライアントを作成
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface SubmitResult {
  success: boolean
  message: string
  pointsAwarded?: number
  error?: string
}

/**
 * ミッション提出処理
 * @param userId ユーザーID
 * @param missionId ミッションID
 * @param type ミッションタイプ ('qr' | 'photo')
 * @param proof 証明データ (QRコードの値 または 画像URL)
 */
export async function submitMission(
  userId: string,
  missionId: string,
  type: 'qr' | 'photo',
  proof: string
): Promise<SubmitResult> {
  try {
    // 1. ミッション情報の取得
    const { data: mission, error: missionError } = await supabase
      .from('monthly_missions')
      .select('*')
      .eq('id', missionId)
      .single()

    if (missionError || !mission) {
      return { success: false, message: 'ミッションが見つかりません', error: 'MISSION_NOT_FOUND' }
    }

    // 2. 既に提出済みかチェック
    const { data: existing, error: checkError } = await supabase
      .from('mission_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('mission_id', missionId)
      .single()

    if (existing) {
      return { success: false, message: 'このミッションは既に完了しています', error: 'ALREADY_COMPLETED' }
    }

    // 3. QRコードの場合の検証
    // 今回は簡易的に「ミッションID」と「読み取ったコード」が一致するかで判定
    // ※実運用ではQRコード専用のカラムを用意するか、ハッシュ検証などを推奨
    if (type === 'qr') {
      if (proof !== missionId) {
        // デバッグ用: もし "hikonyan_mission_clear" などの共通コードならここで許可するロジックを入れる
        // 今回は厳密にID一致とする
        return { success: false, message: '無効なQRコードです', error: 'INVALID_QR' }
      }
    }

    // 4. 写真の場合のAI自動チェック
    let status = type === 'qr' ? 'approved' : 'pending'
    let rejectReason = null

    if (type === 'photo' && proof) {
      try {
        console.log('AI Check Starting...', proof)
        const response = await fetch(proof)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const image = sharp(buffer)
        const metadata = await image.metadata()
        const stats = await image.stats()

        console.log('Image Stats:', stats)

        // チェック1: 画像として認識できるか
        if (!metadata.format) {
          status = 'rejected'
          rejectReason = 'AI判定: 画像ファイルとして認識できませんでした'
        }
        
        // チェック2: 真っ暗ではないか (輝度平均が極端に低い)
        // stats.channels[0] (Red), [1] (Green), [2] (Blue) の mean を確認
        const brightness = (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3
        console.log('Brightness:', brightness)

        if (brightness < 10) { // 閾値は調整が必要だが、10以下はほぼ真っ暗
          status = 'rejected'
          rejectReason = 'AI判定: 画像が暗すぎます（真っ暗な画像は無効です）'
        }

        // チェック3: 単色ではないか (標準偏差が極端に低い)
        const stdev = (stats.channels[0].stdev + stats.channels[1].stdev + stats.channels[2].stdev) / 3
        console.log('Stdev:', stdev)

        if (stdev < 5) {
             // ほぼ単色（完全にグレー、白など）
             // ただし、紙のアップなどはあり得るので、ここは警告のみにするか、一旦保留
             // 今回は真っ暗チェックを優先
        }

      } catch (error) {
        console.error('AI Check Error:', error)
        // AIチェックエラーの場合は一旦保留にするか、rejectedにするか
        // ここでは安全側に倒して pending のままにする（人間が確認）
        // status = 'rejected'
        // rejectReason = 'AI判定: 画像の解析に失敗しました'
      }
    }

    // 5. 提出レコードの作成
    // status は上で決定済み
    
    console.log('📝 [Submit] DB保存開始:', {
      userId,
      missionId,
      status,
      hasImage: !!proof,
      reviewer_comment: rejectReason
    })

    const { error: insertError } = await supabase
      .from('mission_submissions')
      .insert({
        user_id: userId,
        mission_id: missionId,
        status: status, // pending, approved, or rejected
        image_url: type === 'photo' ? proof : null,
        reviewer_comment: rejectReason || null // nullを明示的に設定
      })

    if (insertError) {
      console.error('❌ [Submit] DB Insert Error:', insertError)
      return { success: false, message: '提出に失敗しました: ' + insertError.message, error: insertError.message }
    }

    console.log('✅ [Submit] DB保存成功')

    if (type === 'qr') {
      // プロフィールのポイントを加算
      // RPCがあればそれを使うが、ここでは直接加算する（トランザクションではないため厳密には不整合のリスクがあるが、今回は許容）
      // 理想: await supabase.rpc('increment_points', { user_id: userId, amount: mission.points })
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single()
      
      const currentPoints = profile?.points || 0
      const newPoints = currentPoints + mission.points

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', userId)

      if (updateError) {
        console.error('Point Update Error:', updateError)
        return { success: false, message: 'ポイント付与に失敗しました', error: updateError.message }
      }

      // ポイント履歴にも記録
      const { error: historyError } = await supabase
        .from('point_history')
        .insert({
          user_id: userId,
          amount: mission.points,
          reason: `ミッション完了: ${mission.title}`,
          type: 'earned', // 付与タイプ（earned, spentなど）
          created_at: new Date().toISOString()
        })
      
      if (historyError) {
        console.error('Point History Error:', historyError)
        // 履歴保存失敗は致命的ではないので続行
      }
      
      return { 
        success: true, 
        message: `ミッション完了！${mission.points}pt獲得しました！`,
        pointsAwarded: mission.points
      }
    } else {
      // 写真の場合
      if (status === 'rejected') {
        return {
          success: false,
          message: rejectReason || '画像が不適切と判定されました',
          error: 'AI_REJECTED'
        }
      }
      
      return {
        success: true,
        message: '写真を提出しました！AIチェック完了、承認をお待ちください。'
      }
    }

  } catch (err: any) {
    console.error('Submit Mission Exception:', err)
    return { success: false, message: '予期せぬエラーが発生しました', error: err.message }
  }
}
