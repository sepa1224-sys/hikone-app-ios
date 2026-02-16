'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// フレンド情報の型定義
export interface Friend {
  id: string
  friend_id: string
  full_name: string | null
  avatar_url: string | null
  referral_code: string | null
  created_at: string
}

// フレンドリスト取得用のフェッチャー
const fetchFriends = async (userId: string): Promise<Friend[]> => {
  if (!userId) {
    console.log('👥 [fetchFriends] userIdが空です')
    return []
  }
  
  console.log(`👥 [fetchFriends] 取得開始: userId=${userId}`)
  
  try {
    // ステップ1: friendsテーブルからuser_idが一致する行をすべて取得
    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select('id, friend_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    console.log('👥 [fetchFriends] friendsテーブル結果:', {
      count: friendsData?.length,
      error: friendsError?.message,
      data: friendsData
    })
    
    if (friendsError) {
      console.error('👥 [fetchFriends] friendsテーブルエラー:', friendsError)
      return []
    }
    
    if (!friendsData || friendsData.length === 0) {
      console.log('👥 [fetchFriends] フレンドが0件です')
      return []
    }
    
    // ステップ2: 各フレンドのプロフィール情報を取得（JOINの代わりに個別取得）
    const friendIds = friendsData.map(f => f.friend_id)
    console.log('👥 [fetchFriends] 取得するフレンドID:', friendIds)
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, referral_code')
      .in('id', friendIds)
    
    console.log('👥 [fetchFriends] profilesテーブル結果:', {
      count: profilesData?.length,
      error: profilesError?.message,
      data: profilesData
    })
    
    if (profilesError) {
      console.error('👥 [fetchFriends] profilesテーブルエラー:', profilesError)
      // プロフィール取得に失敗しても、フレンドID情報は返す
    }
    
    // ステップ3: フレンド情報とプロフィール情報を結合
    const profilesMap = new Map(
      (profilesData || []).map(p => [p.id, p])
    )
    
    const friends: Friend[] = friendsData.map((item) => {
      const profile = profilesMap.get(item.friend_id)
      return {
        id: item.id,
        friend_id: item.friend_id,
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        referral_code: profile?.referral_code || null,
        created_at: item.created_at
      }
    })
    
    console.log(`👥 [fetchFriends] 取得成功: ${friends.length}人のフレンド`)
    console.log('👥 [fetchFriends] フレンドリスト:', friends)
    
    return friends
  } catch (err) {
    console.error('👥 [fetchFriends] 例外:', err)
    return []
  }
}

/**
 * フレンドリストをSWRでキャッシュして取得するカスタムフック
 */
export function useFriends(userId: string | null) {
  console.log('👥 [useFriends] フック初期化: userId=', userId)
  
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `friends:${userId}` : null,
    () => fetchFriends(userId!),
    {
      revalidateOnFocus: true, // フォーカス時に再取得
      revalidateOnReconnect: true, // 再接続時に再取得
      dedupingInterval: 5000, // 5秒間は重複リクエストを防ぐ
      revalidateIfStale: true, // staleなら再検証
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  )
  
  // デバッグ: データ状態をログ出力
  console.log('👥 [useFriends] 現在の状態:', {
    userId,
    dataCount: data?.length ?? 0,
    isLoading,
    hasError: !!error
  })
  
  // フレンドを追加してローカルステートを即座に更新 + 再フェッチ
  const addFriendToList = (newFriend: Friend) => {
    console.log('👥 [addFriendToList] フレンドを追加:', newFriend)
    
    // 即座にローカル更新
    mutate((current) => {
      if (!current) return [newFriend]
      // 重複チェック
      if (current.some(f => f.friend_id === newFriend.friend_id)) {
        console.log('👥 [addFriendToList] 既に存在するためスキップ')
        return current
      }
      const updated = [newFriend, ...current]
      console.log('👥 [addFriendToList] 更新後のリスト:', updated.length, '人')
      return updated
    }, false)
    
    // 少し遅れてサーバーから再フェッチして確実に同期
    setTimeout(() => {
      console.log('👥 [addFriendToList] 再フェッチ実行')
      mutate()
    }, 500)
  }
  
  // フレンドを削除してローカルステートを即座に更新 + 再フェッチ
  const removeFriendFromList = (friendId: string) => {
    console.log('👥 [removeFriendFromList] フレンドを削除:', friendId)
    
    mutate((current) => {
      if (!current) return []
      const updated = current.filter(f => f.friend_id !== friendId)
      console.log('👥 [removeFriendFromList] 更新後のリスト:', updated.length, '人')
      return updated
    }, false)
    
    // 少し遅れてサーバーから再フェッチ
    setTimeout(() => {
      console.log('👥 [removeFriendFromList] 再フェッチ実行')
      mutate()
    }, 500)
  }
  
  // 強制的に再フェッチする関数
  const forceRefetch = () => {
    console.log('👥 [forceRefetch] 強制再フェッチ')
    return mutate(undefined, { revalidate: true })
  }
  
  return {
    friends: data ?? [],
    error,
    isLoading,
    refetch: forceRefetch,
    addFriendToList,
    removeFriendFromList
  }
}

// フレンド追加結果の型
export interface AddFriendResult {
  success: boolean
  message: string
  friend?: Friend
}

/**
 * 招待コードでユーザーを検索（大文字小文字を区別しない）
 */
export async function searchUserByCode(referralCode: string): Promise<{
  found: boolean
  userId?: string
  name?: string
  avatarUrl?: string
  referralCode?: string
}> {
  try {
    if (!referralCode || referralCode.trim().length === 0) {
      console.log('🔍 [searchUserByCode] コードが空です')
      return { found: false }
    }
    
    const code = referralCode.trim()
    console.log(`🔍 [searchUserByCode] 検索開始: "${code}"`)
    
    // ilikeを使用して大文字小文字を区別しない検索
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, referral_code')
      .ilike('referral_code', code)
      .single()
    
    if (error) {
      console.log(`🔍 [searchUserByCode] エラー:`, error.message)
      return { found: false }
    }
    
    if (!data) {
      console.log(`🔍 [searchUserByCode] データなし`)
      return { found: false }
    }
    
    console.log(`🔍 [searchUserByCode] 見つかりました: ${data.id}, ${data.full_name || 'ユーザー'}`)
    
    return {
      found: true,
      userId: data.id,
      name: data.full_name || 'ユーザー',
      avatarUrl: data.avatar_url || undefined,
      referralCode: data.referral_code || undefined
    }
  } catch (err) {
    console.error('🔍 [searchUserByCode] 例外:', err)
    return { found: false }
  }
}

/**
 * フレンドを追加（大文字小文字を区別しない検索 + 詳細なエラーハンドリング）
 */
export async function addFriend(
  userId: string,
  friendReferralCode: string
): Promise<AddFriendResult> {
  console.log(`👥 [addFriend] 開始: userId=${userId}, code=${friendReferralCode}`)
  
  try {
    // バリデーション: ログイン確認
    if (!userId) {
      console.log('👥 [addFriend] エラー: ログインが必要')
      return { success: false, message: '🔒 ログインが必要です' }
    }
    
    // バリデーション: コード入力確認
    if (!friendReferralCode || friendReferralCode.trim().length === 0) {
      console.log('👥 [addFriend] エラー: コードが空')
      return { success: false, message: '📝 招待コードを入力してください' }
    }
    
    const code = friendReferralCode.trim()
    console.log(`👥 [addFriend] 検索するコード: "${code}"`)
    
    // ステップ1: 招待コードでユーザーを検索（ilikeで大文字小文字を区別しない）
    const { data: friendProfiles, error: searchError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, referral_code')
      .ilike('referral_code', code)
    
    console.log(`👥 [addFriend] 検索結果:`, { 
      count: friendProfiles?.length, 
      error: searchError?.message,
      data: friendProfiles 
    })
    
    if (searchError) {
      console.error('👥 [addFriend] 検索エラー:', searchError)
      return { success: false, message: `🔍 検索エラー: ${searchError.message}` }
    }
    
    if (!friendProfiles || friendProfiles.length === 0) {
      console.log('👥 [addFriend] ユーザーが見つかりません')
      return { success: false, message: '🔍 ユーザーが見つかりません。コードを確認してください。' }
    }
    
    // 最初にマッチしたプロフィールを使用
    const friendProfile = friendProfiles[0]
    console.log(`👥 [addFriend] 見つかったユーザー: ${friendProfile.id}, ${friendProfile.full_name}`)
    
    // ステップ2: 自分自身を追加しようとしていないかチェック
    if (friendProfile.id === userId) {
      console.log('👥 [addFriend] エラー: 自分自身')
      return { success: false, message: '🙅 自分自身は登録できません' }
    }
    
    // ステップ3: 既にフレンドかチェック
    const { data: existingFriends, error: existingError } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friendProfile.id)
    
    console.log(`👥 [addFriend] 既存チェック:`, { 
      count: existingFriends?.length, 
      error: existingError?.message 
    })
    
    if (existingError) {
      console.error('👥 [addFriend] 既存チェックエラー:', existingError)
      return { success: false, message: `⚠️ 確認エラー: ${existingError.message}` }
    }
    
    if (existingFriends && existingFriends.length > 0) {
      console.log('👥 [addFriend] エラー: 登録済み')
      return { success: false, message: '✅ 既に登録済みです' }
    }
    
    // ステップ4: フレンドを追加
    console.log(`👥 [addFriend] 追加実行: user_id=${userId}, friend_id=${friendProfile.id}`)
    
    const { data: newFriend, error: insertError } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendProfile.id
      })
      .select('id, friend_id, created_at')
      .single()
    
    if (insertError) {
      console.error('👥 [addFriend] 追加エラー:', insertError)
      
      // 重複エラーの場合
      if (insertError.code === '23505') {
        return { success: false, message: '✅ 既に登録済みです' }
      }
      
      return { success: false, message: `❌ 登録に失敗しました: ${insertError.message}` }
    }
    
    console.log(`👥 [addFriend] 追加成功:`, newFriend)
    
    // 成功
    const friendData: Friend = {
      id: newFriend.id,
      friend_id: friendProfile.id,
      full_name: friendProfile.full_name,
      avatar_url: friendProfile.avatar_url,
      referral_code: friendProfile.referral_code,
      created_at: newFriend.created_at
    }
    
    return {
      success: true,
      message: `🎉 ${friendProfile.full_name || 'ユーザー'}さんをフレンドに追加しました！`,
      friend: friendData
    }
  } catch (error: any) {
    console.error('👥 [addFriend] 例外:', error)
    return { success: false, message: `❌ エラーが発生しました: ${error.message || '不明なエラー'}` }
  }
}

/**
 * フレンドを削除
 */
export async function removeFriend(
  userId: string,
  friendId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId || !friendId) {
      return { success: false, message: 'パラメータが不正です' }
    }
    
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId)
    
    if (error) {
      console.error('フレンド削除エラー:', error)
      return { success: false, message: 'フレンドの削除に失敗しました' }
    }
    
    return { success: true, message: 'フレンドを削除しました' }
  } catch (error) {
    console.error('フレンド削除エラー:', error)
    return { success: false, message: '予期しないエラーが発生しました' }
  }
}
