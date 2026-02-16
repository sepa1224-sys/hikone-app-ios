-- 1. updated_at カラムの追加 (これが欠損していたためのエラー修正)
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. ステータス制約の更新 ('completed' を許可する)
-- 既存の制約名を推測して削除 (通常は payout_requests_status_check)
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_status_check;

-- 新しい制約を追加 ('paid' も残しつつ 'completed' を追加)
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'completed'));
