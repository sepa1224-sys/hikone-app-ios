-- =====================================================
-- マイグレーション: お気に入り機能と閲覧数カウンター
-- =====================================================

-- 1. shops テーブルに view_count カラムを追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. お気に入りテーブルの作成
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 同じユーザーが同じ店舗を重複登録できないようにする
  UNIQUE(user_id, shop_id)
);

-- 3. インデックスの作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_shop_id ON favorites(shop_id);
CREATE INDEX IF NOT EXISTS idx_shops_view_count ON shops(view_count DESC);

-- 4. RLS (Row Level Security) ポリシーの設定
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のお気に入りのみ参照可能
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のお気に入りのみ追加可能
CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のお気に入りのみ削除可能
CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- 5. 閲覧数をインクリメントする関数
CREATE OR REPLACE FUNCTION increment_view_count(shop_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE shops 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = shop_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 人気店舗トップNを取得するビュー（オプション）
CREATE OR REPLACE VIEW popular_shops AS
SELECT 
  id,
  name,
  category,
  address,
  latitude,
  longitude,
  opening_hours,
  phone,
  image_url,
  price_range,
  view_count
FROM shops
WHERE view_count > 0
ORDER BY view_count DESC
LIMIT 10;
