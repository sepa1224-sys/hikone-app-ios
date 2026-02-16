'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 距離計算用 (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // 地球の半径 (メートル)
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export async function grantStamp(shopId: string, userLat: number, userLng: number) {
  const supabase = createClient()
  const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'ログインが必要です' }
    }

    // 2. 店舗の位置情報を取得
    const { data: shop, error: shopError } = await serviceClient
      .from('shops')
      .select('latitude, longitude, name')
      .eq('id', shopId)
      .single()

    if (shopError || !shop) {
      return { success: false, message: '店舗情報が見つかりません' }
    }

    if (shop.latitude === null || shop.longitude === null) {
      return { success: false, message: '店舗の位置情報が登録されていません' }
    }

    // 3. 距離チェック (50m以内)
    const distance = calculateDistance(userLat, userLng, shop.latitude, shop.longitude)
    console.log(`[Stamp Debug] User: (${userLat}, ${userLng}), Shop: (${shop.latitude}, ${shop.longitude}), Distance: ${distance}m`)

    // 管理者バイパス (ADR-006): ドイツ開発拠点からのテスト用
    const isAdminBypass = user.email === 'sepa1224@gmail.com'
    if (isAdminBypass) {
      console.log('[Stamp Debug] Admin bypass active: Skipping distance check.')
    }

    if (distance > 50 && !isAdminBypass) {
      return { 
        success: false, 
        message: `店舗からの距離が遠すぎます（現在地から約${Math.round(distance)}m）。店舗に近づいて再度お試しください。` 
      }
    }

    // 4. スタンプ付与 (24時間制限はDBトリガーでチェック)
    // 3層構造移行に伴い、user_stamps(状態)の更新とstamp_logs(履歴)の追加を行う
    
    // 4.1 ユーザーの所持カードを取得または作成
    let { data: userCard, error: fetchError } = await serviceClient
      .from('user_stamps')
      .select('*')
      .eq('user_id', user.id)
      .eq('stamp_card_id', shopId)
      .single()
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // カードがない場合は新規作成
      const { data: newCard, error: createError } = await serviceClient
        .from('user_stamps')
        .insert({
          user_id: user.id,
          stamp_card_id: shopId,
          current_count: 0,
          is_completed: false
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Create user card error:', createError)
        return { success: false, message: 'カードの作成に失敗しました' }
      }
      userCard = newCard
    } else if (fetchError) {
      console.error('Fetch user card error:', fetchError)
      return { success: false, message: 'カード情報の取得に失敗しました' }
    }

    // 4.2 直近のスタンプ履歴をチェック (24時間以内の重複防止)
    const { data: lastLog } = await serviceClient
      .from('stamp_logs')
      .select('stamped_at')
      .eq('user_stamp_id', userCard.id)
      .order('stamped_at', { ascending: false })
      .limit(1)
      .single()

    if (lastLog) {
      const lastStamped = new Date(lastLog.stamped_at).getTime()
      const now = new Date().getTime()
      const hoursDiff = (now - lastStamped) / (1000 * 60 * 60)
      
      if (hoursDiff < 24) {
        return { success: false, message: 'この店舗のスタンプは1日1回までです。明日またお越しください！' }
      }
    }

    // 4.3 スタンプ履歴(Log)を追加
    const { error: logError } = await serviceClient
      .from('stamp_logs')
      .insert({
        user_stamp_id: userCard.id,
        stamped_at: new Date().toISOString(),
        location_lat: userLat,
        location_lng: userLng
      })

    if (logError) {
      console.error('Stamp log insert error:', logError)
      return { success: false, message: 'スタンプ履歴の記録に失敗しました' }
    }

    // 4.4 カード状態(UserStamp)を更新 (カウントアップ)
    const { data: updatedCard, error: updateError } = await serviceClient
      .from('user_stamps')
      .update({
        current_count: userCard.current_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userCard.id)
      .select()
      .single()

    if (updateError) {
      console.error('Stamp count update error:', updateError)
      return { success: false, message: 'スタンプ数の更新に失敗しました' }
    }

    // 5. クーポン判定 (スタンプ数が目標に達したらクーポン発行)
    try {
      const currentCount = updatedCard.current_count
      
      // スタンプカード設定を取得
      const { data: cardSettings } = await serviceClient
        .from('stamp_cards')
        .select('target_count, reward_description, expiry_days')
        .eq('shop_id', shopId)
        .single()
      
      const target = cardSettings?.target_count || 10

      console.log(`[Stamp Debug] Count: ${currentCount}, Target: ${target}`)

      // 目標達成時の処理
      if (currentCount > 0 && currentCount % target === 0) {
        const expiryDays = cardSettings?.expiry_days || 180 // デフォルト180日
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + expiryDays)

        // クーポン作成
        const { error: couponError } = await serviceClient
          .from('coupons')
          .insert({
            user_id: user.id,
            shop_id: shopId,
            status: 'unused', //未使用
            title: cardSettings?.reward_description || 'スタンプコンプリート特典',
            description: `${target}個スタンプ達成の特典チケットです`,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          })

        if (couponError) {
          console.error('Coupon creation error:', couponError)
          // クーポン作成失敗してもスタンプは付与されているので成功とするが、メッセージで伝えるか？
          // ここではユーザーには「スタンプ獲得」のみ伝えるが、ログには残す
        } else {
          return { 
            success: true, 
            message: 'スタンプが貯まりました！特典チケットを獲得しました！', 
            shopName: shop.name,
            isCompleted: true 
          }
        }
      }
    } catch (couponProcessError) {
      console.error('Coupon process error:', couponProcessError)
    }

    return { success: true, message: 'スタンプを獲得しました！', shopName: shop.name }
  } catch (error: any) {
    console.error('Grant stamp error:', error)
    return { success: false, message: '予期せぬエラーが発生しました' }
  }
}

export async function getStampCard(shopId: string) {
  const supabase = createClient()
  
  try {
    // スタンプカード設定と店舗情報を取得
    const { data: card, error } = await supabase
      .from('stamp_cards')
      .select(`
        *,
        shops (
          name,
          image_url
        )
      `)
      .eq('shop_id', shopId)
      .single()

    if (error) {
      // カード未設定の場合はnullを返す
      return { success: false, message: 'スタンプカードが見つかりません' }
    }

    return { success: true, card }
  } catch (error) {
    return { success: false, message: 'エラーが発生しました' }
  }
}

export async function getUserStamps(shopId: string) {
  const supabase = createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'ログインが必要です' }

    // 1. ユーザーの所持カードを取得
    const { data: card, error: cardError } = await supabase
      .from('user_stamps')
      .select('*')
      .eq('user_id', user.id)
      .eq('stamp_card_id', shopId)
      .single()

    if (cardError) {
      // カード未所持の場合はログなしで返す
      return { success: true, stamps: [] }
    }

    // 2. スタンプ履歴(Logs)を取得
    const { data: logs, error: logsError } = await supabase
      .from('stamp_logs')
      .select('*')
      .eq('user_stamp_id', card.id)
      .order('stamped_at', { ascending: false })

    if (logsError) {
      console.error('Fetch stamp logs error:', logsError)
      return { success: false, message: 'スタンプ履歴の取得に失敗しました' }
    }

    return { success: true, stamps: logs }
  } catch (error) {
    return { success: false, message: 'エラーが発生しました' }
  }
}

// ユーザーが持っているスタンプカード一覧を取得
export async function getMyStampCards() {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'ログインが必要です' }

    // user_stamps テーブルから取得 (stamp_cards と shops を結合)
    const { data: cards, error } = await supabase
      .from('user_stamps')
      .select(`
        id,
        current_count,
        updated_at,
        stamp_card_id,
        stamp_cards!inner (
           target_count,
           reward_description,
           shops!inner (
             id,
             name,
             thumbnail_url
           )
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // データ整形
    const formattedCards = cards.map((card: any) => ({
      shopId: card.stamp_cards.shops.id,
      shopName: card.stamp_cards.shops.name,
      thumbnailUrl: card.stamp_cards.shops.thumbnail_url,
      lastStampedAt: card.updated_at,
      stampCount: card.current_count,
      targetCount: card.stamp_cards.target_count,
      reward: card.stamp_cards.reward_description
    }))

    return { success: true, cards: formattedCards }
  } catch (error) {
    console.error('getMyStampCards error:', error)
    return { success: false, message: 'スタンプカードの取得に失敗しました' }
  }
}

// エイリアス: ユーザーが要望した名前に対応
export const getMyActiveStampCards = getMyStampCards

// まだユーザーが所持していない店舗のスタンプカード一覧を取得
export async function getAvailableStampCards() {
  const supabase = createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'ログインが必要です' }

    // 1. ユーザーが既に持っているカードのShopIDを取得
    const { data: myCards, error: myCardsError } = await supabase
      .from('user_stamps')
      .select('stamp_card_id')
      .eq('user_id', user.id)

    if (myCardsError) throw myCardsError

    const myShopIds = myCards.map((c: any) => c.stamp_card_id)

    // 2. stamp_cards テーブルから、自分が持っていないものを取得
    let query = supabase
      .from('stamp_cards')
      .select(`
        target_count,
        reward_description,
        shops!inner (
          id,
          name,
          image_url,
          thumbnail_url,
          address
        )
      `)

    // not.in フィルタを使用して除外
    if (myShopIds.length > 0) {
      // UUIDのリストをPostgREST形式に変換
      query = query.not('shop_id', 'in', `(${myShopIds.join(',')})`)
    }

    const { data: availableCards, error: availableCardsError } = await query
      
    if (availableCardsError) {
        console.error('[getAvailableStampCards] Error fetching available cards:', availableCardsError)
        throw availableCardsError
    }
    
    // データ整形
    const cards = availableCards.map((card: any) => ({
      shopId: card.shops.id,
      shopName: card.shops.name,
      category: card.shops.category,
      imageUrl: card.shops.image_url,
      thumbnailUrl: card.shops.thumbnail_url,
      address: card.shops.address,
      targetCount: card.target_count,
      reward: card.reward_description
    }))

    return { success: true, cards }
  } catch (error) {
    console.error('getAvailableStampCards error:', error)
    return { success: false, message: '利用可能なスタンプカードの取得に失敗しました' }
  }
}

// スタンプカードを実施している店舗一覧を取得
export async function getStampShops() {
  const supabase = createClient()

  try {
    // stamp_cards テーブルに登録がある店舗を取得
    const { data: cards, error } = await supabase
      .from('stamp_cards')
      .select(`
        target_count,
        reward_description,
        shops (
          id,
          name,
          category,
          image_url,
          address,
          latitude,
          longitude
        )
      `)
      
    if (error) throw error

    // データ整形
    const shops = cards.map((card: any) => ({
      id: card.shops.id,
      name: card.shops.name,
      category: card.shops.category,
      imageUrl: card.shops.image_url,
      address: card.shops.address,
      latitude: card.shops.latitude,
      longitude: card.shops.longitude,
      targetCount: card.target_count,
      reward: card.reward_description
    }))

    return { success: true, shops }
  } catch (error) {
    console.error('getStampShops error:', error)
    return { success: false, message: '店舗一覧の取得に失敗しました' }
  }
}

// スタンプカード設定の更新（管理者代理対応）
export async function updateStampCardSettings(
  userId: string,
  settings: {
    targetCount: number
    rewardDescription?: string
    expiryDays?: number
  },
  impersonateShopId?: string
) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    let shopId = impersonateShopId

    // 1. 店舗IDの特定と権限チェック
    if (impersonateShopId) {
      // 管理者権限チェック
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      let isAdmin = false
      if (process.env.ADMIN_EMAIL && user?.email === process.env.ADMIN_EMAIL) {
        isAdmin = true
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, role')
          .eq('id', userId)
          .single()
        isAdmin = profile?.is_admin === true || profile?.role === 'admin'
      }

      if (!isAdmin) {
        return { success: false, message: '権限がありません' }
      }
      console.log(`[ADMIN] Updating stamp card settings for shop: ${impersonateShopId}`)
    } else {
      // 通常オーナー: 自分の店舗IDを取得
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', userId)
        .single()
      
      if (!shop) {
        return { success: false, message: '店舗が見つかりません' }
      }
      shopId = shop.id
    }

    if (!shopId) return { success: false, message: '店舗IDが特定できません' }

    console.log(`[STAMP] Saving stamp card settings. User: ${userId}, Shop: ${shopId}, TargetCount: ${settings.targetCount}`)

    // 2. 設定の保存
    const { error } = await supabase
      .from('stamp_cards')
      .upsert({
        shop_id: shopId,
        target_count: settings.targetCount,
        reward_description: settings.rewardDescription,
        expiry_days: settings.expiryDays,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id'
      })

    if (error) {
      console.error('[STAMP] Update error details:', error)
      throw error
    }

    return { success: true, message: 'スタンプカード設定を保存しました' }
  } catch (error) {
    console.error('[STAMP] updateStampCardSettings error:', error)
    return { success: false, message: '設定の保存に失敗しました' }
  }
}

// ユーザーがスタンプカードを「登録」する（使用開始する）
export async function registerStampCard(shopId: string) {
  const supabase = createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'ログインが必要です' }

    // 既に持っているかチェック
    const { data: existingCard } = await supabase
      .from('user_stamps')
      .select('id')
      .eq('user_id', user.id)
      .eq('stamp_card_id', shopId)
      .single()

    if (existingCard) {
      return { success: true, message: '既にこのカードを持っています', cardId: existingCard.id }
    }

    // 新規作成
    const { data: newCard, error } = await supabase
      .from('user_stamps')
      .insert({
        user_id: user.id,
        stamp_card_id: shopId,
        current_count: 0,
        is_completed: false
      })
      .select()
      .single()

    if (error) {
      console.error('Register stamp card error:', error)
      return { success: false, message: 'カードの登録に失敗しました' }
    }

    return { success: true, message: 'カードを登録しました！', cardId: newCard.id }
  } catch (error) {
    console.error('Register stamp card exception:', error)
    return { success: false, message: 'エラーが発生しました' }
  }
}
