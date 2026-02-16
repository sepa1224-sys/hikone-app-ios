'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// サーバーサイドでは service_role キーを使用（RLSをバイパス）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 招待ポイント
const REFERRAL_BONUS_POINTS = 500

// レスポンス型
export interface ApplyReferralResult {
  success: boolean
  message: string
  error?: string
}

/**
 * 招待コードを適用してポイントを付与する関数
 * 
 * @param currentUserId - 招待コードを入力したユーザー（招待された人）のID
 * @param referralCode - 入力された招待コード
 * @returns { success, message, error }
 */
export async function applyReferralCode(
  currentUserId: string,
  referralCode: string
): Promise<ApplyReferralResult> {
  try {
    // バリデーション
    if (!currentUserId) {
      return { success: false, message: 'ログインが必要です', error: 'USER_NOT_LOGGED_IN' }
    }
    
    if (!referralCode || referralCode.trim().length === 0) {
      return { success: false, message: '招待コードを入力してください', error: 'EMPTY_CODE' }
    }
    
    const code = referralCode.trim().toUpperCase()
    
    console.log(`🎫 [Referral] 招待コード適用開始: ${currentUserId} -> ${code}`)

    // 1. RPCを試行（推奨される方法）
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('apply_referral_bonus', {
        invitee_id: currentUserId,
        referral_code_to_use: code,
        bonus_amount: REFERRAL_BONUS_POINTS
      })

      if (!rpcError && rpcData) {
        console.log('🎫 [Referral] RPC結果:', rpcData)
        if (typeof rpcData === 'object' && 'success' in rpcData) {
          return rpcData as ApplyReferralResult
        }
      }
      
      // RPCが未定義などのエラーの場合は、フォールバックロジックへ
      if (rpcError) {
        console.warn('🎫 [Referral] RPC失敗、フォールバックロジックを実行します:', rpcError)
      }
    } catch (e) {
      console.warn('🎫 [Referral] RPC例外、フォールバックロジックを実行します:', e)
    }

    // 2. フォールバックロジック（RPCが使えない場合）
    // 招待された人（自分）の情報を取得
    const { data: currentUser, error: currentUserError } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code, has_used_referral')
      .eq('id', currentUserId)
      .single()
    
    if (currentUserError || !currentUser) {
      console.error('ユーザー情報取得エラー:', currentUserError)
      return { success: false, message: 'ユーザー情報の取得に失敗しました', error: 'USER_NOT_FOUND' }
    }
    
    // 2. 既に招待コードを使用済みかチェック
    if (currentUser.has_used_referral) {
      return { success: false, message: '既に招待コードを使用済みです', error: 'ALREADY_USED' }
    }
    
    // 3. 自分自身のコードを入力していないかチェック
    if (currentUser.referral_code === code) {
      return { success: false, message: '自分の招待コードは使用できません', error: 'SELF_REFERRAL' }
    }
    
    // 4. 入力されたコードを持つユーザー（招待した人）を探す
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id, full_name, points')
      .eq('referral_code', code)
      .single()
    
    if (referrerError || !referrer) {
      console.error('招待コード検索エラー:', referrerError)
      return { success: false, message: '無効な招待コードです', error: 'INVALID_CODE' }
    }
    
    // 5. トランザクション的に処理（エラー時はロールバックが必要）
    const now = new Date().toISOString()
    
    // 5-1. 招待した人のポイントを +500
    const { error: updateReferrerError } = await supabase
      .from('profiles')
      .update({ points: (referrer.points || 0) + REFERRAL_BONUS_POINTS })
      .eq('id', referrer.id)
    
    if (updateReferrerError) {
      console.error('招待者ポイント更新エラー:', updateReferrerError)
      return { success: false, message: 'ポイント付与に失敗しました', error: 'UPDATE_REFERRER_FAILED' }
    }
    
    // 5-2. 招待した人の point_history に記録
    const { error: historyReferrerError } = await supabase
      .from('point_history')
      .insert({
        user_id: referrer.id,
        amount: REFERRAL_BONUS_POINTS,
        type: 'referral',
        description: `${currentUser.full_name || 'ユーザー'}さんを招待`,
        created_at: now
      })
    
    if (historyReferrerError) {
      console.error('招待者履歴追加エラー:', historyReferrerError)
      // エラーでも続行（ポイントは付与済み）
    }
    
    // 5-3. 招待された人（自分）のポイントを +500
    const { data: currentUserPoints } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', currentUserId)
      .single()
    
    const { error: updateCurrentError } = await supabase
      .from('profiles')
      .update({ 
        points: ((currentUserPoints?.points || 0) + REFERRAL_BONUS_POINTS),
        has_used_referral: true,
        referred_by: referrer.id
      })
      .eq('id', currentUserId)
    
    if (updateCurrentError) {
      console.error('招待された人ポイント更新エラー:', updateCurrentError)
      return { success: false, message: 'ポイント付与に失敗しました', error: 'UPDATE_CURRENT_FAILED' }
    }
    
    // 5-4. 招待された人（自分）の point_history に記録
    const { error: historyCurrentError } = await supabase
      .from('point_history')
      .insert({
        user_id: currentUserId,
        amount: REFERRAL_BONUS_POINTS,
        type: 'referral',
        description: `招待コード特典（${referrer.full_name || 'ユーザー'}さんから）`,
        created_at: now
      })
    
    if (historyCurrentError) {
      console.error('招待された人履歴追加エラー:', historyCurrentError)
      // エラーでも続行（ポイントは付与済み）
    }
    
    console.log(`✅ 招待コード適用成功: ${currentUser.full_name} ← ${referrer.full_name}`)
    
    return { 
      success: true, 
      message: `🎉 ${REFERRAL_BONUS_POINTS}ポイントを獲得しました！` 
    }
    
  } catch (error) {
    console.error('招待コード適用エラー:', error)
    return { success: false, message: '予期しないエラーが発生しました', error: 'UNKNOWN_ERROR' }
  }
}

/**
 * ユーザーが招待コードを使用済みかどうかを確認する関数
 */
export async function checkReferralUsed(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('has_used_referral')
      .eq('id', userId)
      .single()
    
    if (error || !data) {
      return true // エラー時は使用済み扱い（安全側に倒す）
    }
    
    return data.has_used_referral === true
  } catch {
    return true
  }
}
