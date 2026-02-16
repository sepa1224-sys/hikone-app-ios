-- =========================================
-- ポイント機能用テーブル
-- =========================================
-- 
-- Supabase のダッシュボード > SQL Editor で実行してください
--

-- ---------------------------------------------
-- 1. profiles テーブルにポイント関連カラムを追加
-- ---------------------------------------------

-- points カラム（ポイント残高）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- referral_code カラム（招待コード）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE;

-- referred_by カラム（誰に招待されたか）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- ---------------------------------------------
-- 2. point_history テーブル（ポイント履歴）
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS point_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,  -- 正の数=獲得、負の数=使用
  type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'use', 'referral', 'bonus')),
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 3. インデックス
-- ---------------------------------------------

-- profiles テーブル
CREATE INDEX IF NOT EXISTS idx_profiles_points 
ON profiles (points);

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code 
ON profiles (referral_code);

-- point_history テーブル
CREATE INDEX IF NOT EXISTS idx_point_history_user_id 
ON point_history (user_id);

CREATE INDEX IF NOT EXISTS idx_point_history_created_at 
ON point_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_history_type 
ON point_history (type);

-- ---------------------------------------------
-- 4. 招待コード自動生成トリガー
-- ---------------------------------------------

-- 招待コード生成関数
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(8);
  code_exists BOOLEAN;
BEGIN
  -- 招待コードがまだない場合のみ生成
  IF NEW.referral_code IS NULL THEN
    LOOP
      -- 8文字のランダムコード生成（英数字大文字）
      new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
      
      -- 既存コードとの重複チェック
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      
      -- 重複がなければループ終了
      IF NOT code_exists THEN
        NEW.referral_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_generate_referral_code ON profiles;
CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- ---------------------------------------------
-- 5. 既存ユーザーに招待コードを発行
-- ---------------------------------------------

-- 既存ユーザーで招待コードがないユーザーに発行
UPDATE profiles 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- ---------------------------------------------
-- 6. RLS（Row Level Security）ポリシー
-- ---------------------------------------------

-- point_history テーブルのRLS有効化
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の履歴のみ閲覧可能
CREATE POLICY "Users can view own point history" 
ON point_history FOR SELECT 
USING (auth.uid() = user_id);

-- ユーザーは自分の履歴のみ挿入可能（アプリ経由）
CREATE POLICY "Users can insert own point history" 
ON point_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------
-- デモ用：初期ポイントを付与（オプション）
-- ---------------------------------------------

-- 全ユーザーに初回ボーナス100ポイントを付与（必要に応じて実行）
-- UPDATE profiles SET points = 100 WHERE points = 0;

-- ---------------------------------------------
-- 確認用クエリ
-- ---------------------------------------------

-- SELECT id, full_name, points, referral_code FROM profiles LIMIT 10;
-- SELECT * FROM point_history ORDER BY created_at DESC LIMIT 20;
