-- =========================================
-- 招待コード使用フラグ追加
-- =========================================
-- 
-- Supabase のダッシュボード > SQL Editor で実行してください
--

-- ---------------------------------------------
-- 1. profiles テーブルに has_used_referral カラムを追加
-- ---------------------------------------------

-- has_used_referral カラム（招待コード使用済みフラグ）
-- 一度コードを使うと true になり、二度と使えなくなる
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_used_referral BOOLEAN DEFAULT FALSE;

-- ---------------------------------------------
-- 2. インデックス
-- ---------------------------------------------

-- 招待コード未使用ユーザー検索用
CREATE INDEX IF NOT EXISTS idx_profiles_has_used_referral 
ON profiles (has_used_referral) 
WHERE has_used_referral = FALSE;

-- ---------------------------------------------
-- 確認用クエリ
-- ---------------------------------------------

-- SELECT id, full_name, points, referral_code, has_used_referral FROM profiles LIMIT 10;
