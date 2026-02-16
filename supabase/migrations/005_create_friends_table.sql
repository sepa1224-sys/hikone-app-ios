-- =========================================
-- フレンド機能用テーブル
-- =========================================
-- 
-- Supabase のダッシュボード > SQL Editor で実行してください
--

-- ---------------------------------------------
-- 1. friends テーブルの作成
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じフレンド関係の重複を防ぐ
  UNIQUE(user_id, friend_id)
);

-- 自分自身をフレンドに追加できないようにする
ALTER TABLE friends 
ADD CONSTRAINT friends_no_self_add 
CHECK (user_id != friend_id);

-- ---------------------------------------------
-- 2. インデックス
-- ---------------------------------------------

-- ユーザーIDでの検索用
CREATE INDEX IF NOT EXISTS idx_friends_user_id 
ON friends (user_id);

-- フレンドIDでの検索用
CREATE INDEX IF NOT EXISTS idx_friends_friend_id 
ON friends (friend_id);

-- 作成日時でのソート用
CREATE INDEX IF NOT EXISTS idx_friends_created_at 
ON friends (created_at DESC);

-- ---------------------------------------------
-- 3. RLS（Row Level Security）ポリシー
-- ---------------------------------------------

-- RLS有効化
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフレンドリストのみ閲覧可能
CREATE POLICY "Users can view own friends" 
ON friends FOR SELECT 
USING (auth.uid() = user_id);

-- ユーザーは自分のフレンドのみ追加可能
CREATE POLICY "Users can add own friends" 
ON friends FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のフレンドのみ削除可能
CREATE POLICY "Users can delete own friends" 
ON friends FOR DELETE 
USING (auth.uid() = user_id);

-- ---------------------------------------------
-- 確認用クエリ
-- ---------------------------------------------

-- SELECT * FROM friends LIMIT 10;

-- フレンドリスト取得（プロフィール情報付き）
-- SELECT 
--   f.id,
--   f.friend_id,
--   p.full_name,
--   p.avatar_url,
--   p.referral_code
-- FROM friends f
-- JOIN profiles p ON f.friend_id = p.id
-- WHERE f.user_id = 'ユーザーのUUID'
-- ORDER BY f.created_at DESC;
