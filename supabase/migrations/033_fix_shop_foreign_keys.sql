-- shop_bank_details, payout_requests, shop_transactions の外部キー制約修正 & RLSポリシー修正
-- 目的: shop_id カラムが auth.users(id) ではなく shops(id) を参照するようにし、
--       RLSポリシーも shops テーブル経由で所有権を確認するように変更する。

-- --------------------------------------------------------
-- 1. 外部キー制約の修正
-- --------------------------------------------------------

-- 1.1 shop_bank_details
ALTER TABLE shop_bank_details
  DROP CONSTRAINT IF EXISTS shop_bank_details_shop_id_fkey;

ALTER TABLE shop_bank_details
  ADD CONSTRAINT shop_bank_details_shop_id_fkey
  FOREIGN KEY (shop_id)
  REFERENCES shops(id)
  ON DELETE CASCADE;

-- 1.2 payout_requests
ALTER TABLE payout_requests
  DROP CONSTRAINT IF EXISTS payout_requests_shop_id_fkey;

ALTER TABLE payout_requests
  ADD CONSTRAINT payout_requests_shop_id_fkey
  FOREIGN KEY (shop_id)
  REFERENCES shops(id)
  ON DELETE CASCADE;

-- 1.3 shop_transactions
ALTER TABLE shop_transactions
  DROP CONSTRAINT IF EXISTS shop_transactions_shop_id_fkey;

ALTER TABLE shop_transactions
  ADD CONSTRAINT shop_transactions_shop_id_fkey
  FOREIGN KEY (shop_id)
  REFERENCES shops(id)
  ON DELETE CASCADE;

-- --------------------------------------------------------
-- 2. RLSポリシーの修正
-- auth.uid() = shop_id は shop_id がユーザーIDでない限り成立しないため、
-- shopsテーブルのowner_idを確認するロジックに変更する
-- --------------------------------------------------------

-- 2.1 shop_bank_details
DROP POLICY IF EXISTS "Users can insert own shop bank details" ON shop_bank_details;
DROP POLICY IF EXISTS "Users can view own shop bank details" ON shop_bank_details;
DROP POLICY IF EXISTS "Users can update own shop bank details" ON shop_bank_details;

CREATE POLICY "Users can insert own shop bank details" ON shop_bank_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = shop_bank_details.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own shop bank details" ON shop_bank_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = shop_bank_details.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own shop bank details" ON shop_bank_details
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = shop_bank_details.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

-- 2.2 payout_requests
DROP POLICY IF EXISTS "Users can insert own payout requests" ON payout_requests;
DROP POLICY IF EXISTS "Users can view own payout requests" ON payout_requests;

CREATE POLICY "Users can insert own payout requests" ON payout_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = payout_requests.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own payout requests" ON payout_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = payout_requests.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

-- 2.3 shop_transactions
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shop_transactions;
DROP POLICY IF EXISTS "Enable select for own shop transactions" ON shop_transactions;

-- 以前のポリシー名が異なる可能性があるため、念のため削除
DROP POLICY IF EXISTS "Enable insert for own shop transactions" ON shop_transactions;
DROP POLICY IF EXISTS "Enable select for own shop transactions" ON shop_transactions;

CREATE POLICY "Enable insert for own shop transactions" ON shop_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = shop_transactions.shop_id
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Enable select for own shop transactions" ON shop_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shops
      WHERE shops.id = shop_transactions.shop_id
      AND shops.owner_id = auth.uid()
    )
  );
