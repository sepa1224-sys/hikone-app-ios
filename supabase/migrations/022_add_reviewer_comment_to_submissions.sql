-- reviewer_comment カラムの追加
ALTER TABLE public.mission_submissions
ADD COLUMN IF NOT EXISTS reviewer_comment TEXT;

-- status カラムのデフォルト値を 'pending' に設定 (念のため再適用)
ALTER TABLE public.mission_submissions
ALTER COLUMN status SET DEFAULT 'pending';
