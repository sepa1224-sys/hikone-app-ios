-- payout_requests テーブルに admin_note カラムを追加
-- 管理者が振込申請に対してメモを残すための列
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS admin_note TEXT;
