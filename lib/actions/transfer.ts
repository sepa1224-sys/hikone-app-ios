'use client'

import { supabase } from '@/lib/supabase'

// 送金結果の型定義
export interface TransferResult {
  success: boolean
  message: string
  error?: string
  newBalance?: number
}

/**
 * ひこポを送金する関数
 */
export async function sendHikopo(
  senderId: string,
  receiverReferralCode: string,
  amount: number
): Promise<TransferResult> {
  try {
    if (!senderId) {
      return { success: false, message: 'ログインが必要です', error: 'NOT_LOGGED_IN' }
    }
    if (!receiverReferralCode || receiverReferralCode.trim().length === 0) {
      return { success: false, message: '送り先のコードを入力してください', error: 'EMPTY_CODE' }
    }
    if (!amount || amount <= 0) {
      return { success: false, message: '送金額は1以上で入力してください', error: 'INVALID_AMOUNT' }
    }
    if (!Number.isInteger(amount)) {
      return { success: false, message: '送金額は整数で入力してください', error: 'NOT_INTEGER' }
    }

    const code = receiverReferralCode.trim().toUpperCase()

    const { data: receiverData, error: receiverError } = await supabase
      .from('profiles')
      .select('id, full_name, points')
      .eq('referral_code', code)
      .single()

    if (receiverError || !receiverData) {
      return { success: false, message: '送り先のコードが見つかりません', error: 'RECEIVER_NOT_FOUND' }
    }

    const { data, error } = await supabase.rpc('transfer_hikopo', {
      sender_id: senderId,
      receiver_referral_code: code,
      amount: amount
    })

    if (error) {
      const errorMessage = translateError(error.message)
      return { success: false, message: errorMessage, error: error.code || 'RPC_ERROR' }
    }

    return {
      success: true,
      message: `🎉 ${amount}ポイントを送りました！`,
      newBalance: data
    }
  } catch (error: any) {
    return {
      success: false,
      message: '予期しないエラーが発生しました',
      error: 'UNKNOWN_ERROR'
    }
  }
}

function translateError(message: string): string {
  if (message.includes('Insufficient balance')) {
    return '😢 ヒコポが足りません！送金額を減らすか、ヒコポを貯めてから再度お試しください。'
  }
  if (message.includes('Receiver not found')) {
    return '🔍 送り先のコードが見つかりません。8桁の招待コードを確認してください。'
  }
  if (message.includes('Cannot send to yourself')) {
    return '🙅 自分自身にはヒコポを送れません！友達のコードを入力してね。'
  }
  if (message.includes('Amount must be positive')) {
    return '⚠️ 送金額は1ポイント以上で入力してください。'
  }
  if (message.includes('Sender not found')) {
    return '❌ ユーザー情報が見つかりません。ログインし直してください。'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return '📶 通信エラーが発生しました。インターネット接続を確認してください。'
  }
  if (message.includes('timeout')) {
    return '⏱️ 処理がタイムアウトしました。しばらく待ってから再度お試しください。'
  }
  return message ? `⚠️ ${message}` : '❌ 送金に失敗しました。しばらく待ってから再度お試しください。'
}

/**
 * 送金相手の情報を取得（プレビュー用）
 */
export async function getReceiverInfo(referralCode: string): Promise<{
  found: boolean
  name?: string
  avatarUrl?: string
}> {
  try {
    if (!referralCode || referralCode.trim().length === 0) {
      return { found: false }
    }
    const code = referralCode.trim().toUpperCase()
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('referral_code', code)
      .single()

    if (error || !data) {
      return { found: false }
    }
    return {
      found: true,
      name: data.full_name || 'ユーザー',
      avatarUrl: data.avatar_url || undefined
    }
  } catch {
    return { found: false }
  }
}
