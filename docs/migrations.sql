-- ==============================================================================
-- 2026-02-12: 銀行口座・振込申請関連の修正まとめ
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. shop_bank_details テーブルのユニーク制約追加
-- upsert (ON CONFLICT) を機能させるために必須
-- ------------------------------------------------------------------------------
ALTER TABLE shop_bank_details ADD CONSTRAINT shop_bank_details_shop_id_key UNIQUE (shop_id);


-- ------------------------------------------------------------------------------
-- 2. payout_requests スキーマ修正 (042_fix_payout_requests_schema.sql より)
-- ------------------------------------------------------------------------------

-- 口座情報のスナップショット保存用カラム (JSONB)
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS bank_info jsonb;

-- 外部キーの参照先変更 (shops(id) -> profiles(id))
-- 1店舗1オーナー運用に合わせ、owner_id (profile id) を shop_id カラムに保存するように変更
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_shop_id_fkey;

ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES profiles(id);


-- ------------------------------------------------------------------------------
-- 3. payout_requests ステータスとタイムスタンプ修正 (043_fix_payout_requests_updated_at_and_status.sql より)
-- ------------------------------------------------------------------------------

-- updated_at カラムの追加
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ステータス制約の更新 ('completed' を許可)
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_status_check;

ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'completed'));
