-- =========================================
-- 掲示板機能用テーブル
-- =========================================

-- 1. posts テーブル（投稿）
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  university_name TEXT, -- 投稿時の大学名（検索効率化のため非正規化）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. インデックス
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_university_name ON posts(university_name);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- 3. RLSポリシー
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能（ただしフィルタリングはアプリ側で行う、またはポリシーで制限も可能）
-- 今回はアプリ側で university_name でフィルタリングするため、SELECTは開放しつつ、
-- 特定の条件（自分の大学と同じ）で絞り込む形にするが、
-- 厳密にするなら USING (university_name = (SELECT university_name FROM profiles WHERE id = auth.uid()))
-- とする手もある。一旦は全公開でアプリ側制御とする。
CREATE POLICY "Posts are viewable by everyone" 
  ON posts FOR SELECT USING (true);

-- 自分の投稿のみ作成可能
CREATE POLICY "Users can create their own posts" 
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 自分の投稿のみ削除可能
CREATE POLICY "Users can delete their own posts" 
  ON posts FOR DELETE USING (auth.uid() = user_id);
