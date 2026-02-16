-- 1. 足りない「箱」を作る
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS bank_info jsonb;

-- 2. 外部キーの「ねじれ」を直す (店舗IDではなく個人IDに紐付ける)
-- ※1店舗1アカウント運用の実態に合わせ、profiles(id) を参照するように変更
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_shop_id_fkey;

ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_shop_id_fkey
  FOREIGN KEY (shop_id) REFERENCES profiles(id);
