-- 既存の重複を削除してからユニーク制約を付与
-- 注意: 重複データがある場合、このクエリは失敗する可能性があります。
-- その場合は、重複データを削除または修正する必要がありますが、
-- ここではまず制約の追加を試みます。

ALTER TABLE shop_bank_details DROP CONSTRAINT IF EXISTS shop_bank_details_shop_id_key;

-- 重複排除のためのクリーニング（念のため）
-- shop_idごとに最新のupdated_atを持つレコード以外を削除
DELETE FROM shop_bank_details a USING (
  SELECT min(ctid) as ctid, shop_id
    FROM shop_bank_details 
    GROUP BY shop_id HAVING COUNT(*) > 1
  ) b
  WHERE a.shop_id = b.shop_id 
  AND a.ctid <> b.ctid;

-- ユニーク制約の追加
ALTER TABLE shop_bank_details ADD CONSTRAINT shop_bank_details_shop_id_key UNIQUE (shop_id);
