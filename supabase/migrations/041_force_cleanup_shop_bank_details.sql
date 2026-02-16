-- 既存のゴミデータを掃除し、制約を確実にする
-- Note: This script is intended to be run in the Supabase SQL Editor by the user or via a migration tool if available.

-- 1. shop_id が NULL のレコードは不正データなので削除
DELETE FROM shop_bank_details WHERE shop_id IS NULL;

-- 2. 重複がある場合、最新以外を削除 (Cleanup duplicates before adding constraint)
DELETE FROM shop_bank_details a USING (
  SELECT min(ctid) as ctid, shop_id
    FROM shop_bank_details 
    GROUP BY shop_id HAVING COUNT(*) > 1
  ) b
  WHERE a.shop_id = b.shop_id 
  AND a.ctid <> b.ctid;

-- 3. 既存の制約があれば削除して再作成
ALTER TABLE shop_bank_details DROP CONSTRAINT IF EXISTS shop_bank_details_shop_id_key;
ALTER TABLE shop_bank_details ADD CONSTRAINT shop_bank_details_shop_id_key UNIQUE (shop_id);
