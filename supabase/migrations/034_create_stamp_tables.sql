-- スタンプカード機能用テーブル

-- 1. スタンプカード設定 (1店舗につき1枚)
CREATE TABLE IF NOT EXISTS stamp_cards (
  shop_id UUID PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  target_count INTEGER NOT NULL DEFAULT 10, -- 特典に必要なスタンプ数
  reward_description TEXT NOT NULL, -- 特典内容
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ユーザースタンプ履歴
CREATE TABLE IF NOT EXISTS user_stamps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  stamped_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE, -- 有効期限（オプション）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_stamps_user_shop ON user_stamps(user_id, shop_id);
CREATE INDEX IF NOT EXISTS idx_user_stamps_shop_date ON user_stamps(shop_id, stamped_at DESC);

-- RLS設定
ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;

-- stamp_cards policies
-- 誰でも参照可能
CREATE POLICY "Public can view stamp cards" ON stamp_cards
  FOR SELECT USING (true);

-- 店舗オーナーのみ作成・更新可能
CREATE POLICY "Owners can insert own stamp card" ON stamp_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = stamp_cards.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update own stamp card" ON stamp_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = stamp_cards.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

-- user_stamps policies
-- ユーザーは自分のスタンプを参照可能
CREATE POLICY "Users can view own stamps" ON user_stamps
  FOR SELECT USING (auth.uid() = user_id);

-- 店舗オーナーも自分の店舗のスタンプ履歴を参照可能（分析用など）
CREATE POLICY "Shop owners can view stamps given at their shop" ON user_stamps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = user_stamps.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

-- スタンプの追加はServer Action (Service Role) 経由で行うため、
-- 一般ユーザーからの直接INSERTは許可しない、または自分のIDなら許可するか検討。
-- ここではセキュリティのため、INSERTポリシーは作成せず、Service Role Keyを使用する運用とする。
-- あるいは、authenticatedユーザーが自分用のスタンプを追加できるようにし、
-- トリガーで厳密なチェックを行うアプローチもあるが、
-- GPSチェック等のロジックを強制するため、Server Action経由のみとするのが安全。

-- 3. 24時間以内の重複スタンプ防止トリガー
CREATE OR REPLACE FUNCTION check_stamp_cooldown()
RETURNS TRIGGER AS $$
BEGIN
  -- 同じユーザー・同じ店舗で、24時間以内のスタンプが存在するか確認
  IF EXISTS (
    SELECT 1 FROM user_stamps
    WHERE user_id = NEW.user_id
      AND shop_id = NEW.shop_id
      AND stamped_at > (NEW.stamped_at - INTERVAL '24 hours')
  ) THEN
    RAISE EXCEPTION 'スタンプは1日1回（24時間経過後）までしか押せません';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_stamp_cooldown
  BEFORE INSERT ON user_stamps
  FOR EACH ROW
  EXECUTE FUNCTION check_stamp_cooldown();
