-- 既存の重複チェック用制約を追加
ALTER TABLE shop_bank_details 
ADD CONSTRAINT shop_bank_details_shop_id_key UNIQUE (shop_id);
