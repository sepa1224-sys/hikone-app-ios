-- ============================================================
-- 彦根くらしアプリ: add_stamp RPC関数 + stamp_cards RLS修正
-- 作成日: 2026-03-15
-- ※ 冪等設計: 何度実行しても安全
-- ============================================================

-- ─── 1. stamp_cards テーブルの整備 ────────────────────────────

-- reward_description を nullable に（未入力でも保存できるよう）
ALTER TABLE stamp_cards
  ALTER COLUMN reward_description DROP NOT NULL;

-- ─── 2. stamp_cards の RLS を正しく設定 ──────────────────────
-- 壊れていたポリシー（auth.uid() = shop_id という誤った条件）を削除し再作成

DROP POLICY IF EXISTS "Owners can manage their own stamp cards" ON stamp_cards;
DROP POLICY IF EXISTS "Owners can insert own stamp card" ON stamp_cards;
DROP POLICY IF EXISTS "Owners can update own stamp card" ON stamp_cards;
DROP POLICY IF EXISTS "Public can view stamp cards" ON stamp_cards;
DROP POLICY IF EXISTS "stamp_cards_public_read" ON stamp_cards;
DROP POLICY IF EXISTS "stamp_cards_owner_insert" ON stamp_cards;
DROP POLICY IF EXISTS "stamp_cards_owner_update" ON stamp_cards;

-- 全員が閲覧可能
CREATE POLICY "stamp_cards_public_read"
  ON stamp_cards FOR SELECT
  USING (true);

-- 店舗オーナーのみ INSERT（shops.owner_id で照合）
CREATE POLICY "stamp_cards_owner_insert"
  ON stamp_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops
       WHERE shops.id = stamp_cards.shop_id
         AND shops.owner_id = auth.uid()
    )
  );

-- 店舗オーナーまたは管理者が UPDATE
CREATE POLICY "stamp_cards_owner_update"
  ON stamp_cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shops
       WHERE shops.id = stamp_cards.shop_id
         AND shops.owner_id = auth.uid()
    )
    OR is_admin()
  );

-- ─── 3. user_stamps の RLS を整備 ────────────────────────────
-- ※ 20260213130000 で作成済みだが、冪等に再設定

ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cards" ON user_stamps;
DROP POLICY IF EXISTS "Users can create their own cards" ON user_stamps;
DROP POLICY IF EXISTS "Users can update their own cards" ON user_stamps;

CREATE POLICY "user_stamps_select"
  ON user_stamps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_stamps_insert"
  ON user_stamps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_stamps_update"
  ON user_stamps FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── 4. add_stamp RPC 関数 ────────────────────────────────────
-- スタンプ付与: p_user_id のユーザーに p_shop_id のスタンプを1枚追加
-- SECURITY DEFINER: RLSをバイパスしてアトミックに処理
CREATE OR REPLACE FUNCTION add_stamp(p_user_id UUID, p_shop_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_count  INTEGER;
  v_current_count INTEGER;
  v_new_count     INTEGER;
  v_completed     BOOLEAN := FALSE;
  v_reward        TEXT;
BEGIN
  -- 1. このお店のスタンプカード設定を取得
  SELECT target_count, reward_description
    INTO v_target_count, v_reward
    FROM stamp_cards
   WHERE shop_id = p_shop_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error',   'このお店のスタンプカードが見つかりません'
    );
  END IF;

  -- 2. ユーザーのスタンプ状態を初回作成（すでにあれば何もしない）
  INSERT INTO user_stamps (user_id, stamp_card_id, current_count)
  VALUES (p_user_id, p_shop_id, 0)
  ON CONFLICT (user_id, stamp_card_id) DO NOTHING;

  -- 3. 現在のカウントを取得
  SELECT current_count
    INTO v_current_count
    FROM user_stamps
   WHERE user_id = p_user_id AND stamp_card_id = p_shop_id;

  -- 4. カウントアップ
  v_new_count := v_current_count + 1;

  -- 5. コンプリート判定（目標枚数に達したらリセット）
  IF v_new_count >= v_target_count THEN
    v_completed := TRUE;
    v_new_count := 0;
  END IF;

  -- 6. 更新
  UPDATE user_stamps
     SET current_count = v_new_count,
         is_completed  = v_completed,
         updated_at    = NOW()
   WHERE user_id = p_user_id AND stamp_card_id = p_shop_id;

  RETURN json_build_object(
    'success',            true,
    'completed',          v_completed,
    'current_count',      v_new_count,
    'target_count',       v_target_count,
    'reward_description', v_reward
  );
END;
$$;
