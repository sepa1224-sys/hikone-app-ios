-- ============================================================
-- 彦根くらしアプリ: area_key追加・RLS修正・hikone_waste_master作成
-- 作成日: 2026-03-17
-- ============================================================

-- ─── 1. profiles に area_key カラムを追加 ────────────────────
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS area_key TEXT;

COMMENT ON COLUMN profiles.area_key IS 'ゴミ収集エリアキー（hikone_waste_master.area_key と対応）';

CREATE INDEX IF NOT EXISTS idx_profiles_area_key ON profiles(area_key);


-- ─── 2. municipalities の SELECT ポリシーを追加 ──────────────
-- 誰でも市区町村一覧を参照できるようにする
DROP POLICY IF EXISTS "municipalities_select" ON municipalities;

CREATE POLICY "municipalities_select"
  ON municipalities FOR SELECT
  USING (true);


-- ─── 3. hikone_waste_master テーブルを作成（既存テーブルに追記対応） ──
CREATE TABLE IF NOT EXISTS hikone_waste_master (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key    TEXT NOT NULL UNIQUE,   -- エリアキー（例: 城南・城陽・若葉・高宮）
  burnable    TEXT,                   -- 燃やせるごみ（例: 火 金）
  landfill_waste TEXT,                -- 埋立ごみ
  pet_bottles TEXT,                   -- ペットボトル
  cans_and_metal TEXT,                -- 缶 金属類
  glass_bottles  TEXT,                -- びん
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- area_name カラムが未存在の場合は追加
ALTER TABLE hikone_waste_master
ADD COLUMN IF NOT EXISTS area_name TEXT;

COMMENT ON TABLE hikone_waste_master IS '彦根市ゴミ収集スケジュールマスター';

CREATE INDEX IF NOT EXISTS idx_hikone_waste_master_area_key
  ON hikone_waste_master (area_key);


-- ─── 4. hikone_waste_master の RLS ──────────────────────────
ALTER TABLE hikone_waste_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waste_master_select" ON hikone_waste_master;
DROP POLICY IF EXISTS "waste_master_admin_all" ON hikone_waste_master;

-- 誰でも閲覧可能
CREATE POLICY "waste_master_select"
  ON hikone_waste_master FOR SELECT
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "waste_master_admin_all"
  ON hikone_waste_master FOR ALL
  USING (is_admin());


-- ─── 5. 彦根市のゴミ収集データを初期投入 ────────────────────
-- ※ 実際のデータは彦根市公式の収集カレンダーに基づいて設定してください
-- 以下はサンプルデータです（実際の収集日と異なる場合があります）
INSERT INTO hikone_waste_master (area_key, area_name, burnable, landfill_waste, pet_bottles, cans_and_metal, glass_bottles)
VALUES
  ('河瀬・亀山・稲枝東・稲枝北・稲枝西', '河瀬・亀山・稲枝東・稲枝北・稲枝西', '火 金', '第2水曜', '第1・3水曜', '第4水曜', '第2・4水曜'),
  ('旭森・鳥居本・佐和山', '旭森・鳥居本・佐和山', '火 金', '第2木曜', '第1・3木曜', '第4木曜', '第2・4木曜'),
  ('平田・金城', '平田・金城', '月 木', '第2火曜', '第1・3火曜', '第4火曜', '第2・4火曜'),
  ('城西', '城西', '月 木', '第2水曜', '第1・3水曜', '第4水曜', '第2・4水曜'),
  ('城南・城陽・若葉・高宮', '城南・城陽・若葉・高宮', '水 土', '第2月曜', '第1・3月曜', '第4月曜', '第2・4月曜'),
  ('城東・城北', '城東・城北', '水 土', '第2火曜', '第1・3火曜', '第4火曜', '第2・4火曜')
ON CONFLICT (area_key) DO NOTHING;
