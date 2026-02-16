-- =========================================
-- メニュー管理機能用テーブル
-- =========================================
-- 
-- Supabase のダッシュボード > SQL Editor で実行してください
--

-- ---------------------------------------------
-- 1. menu_items テーブルの作成
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('lunch', 'dinner', 'drink', 'dessert', 'other')),
  is_available BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 2. インデックス
-- ---------------------------------------------

-- ショップIDでの検索用
CREATE INDEX IF NOT EXISTS idx_menu_items_shop_id 
ON menu_items (shop_id);

-- カテゴリでのフィルタリング用
CREATE INDEX IF NOT EXISTS idx_menu_items_category 
ON menu_items (category);

-- 並び順でのソート用
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order 
ON menu_items (shop_id, sort_order);

-- ---------------------------------------------
-- 3. RLS（Row Level Security）ポリシー
-- ---------------------------------------------

-- RLS有効化
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- 誰でもメニューを閲覧可能
CREATE POLICY "Anyone can view menu items" 
ON menu_items FOR SELECT 
USING (true);

-- 認証済みユーザーはメニューを追加可能
CREATE POLICY "Authenticated users can add menu items" 
ON menu_items FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 認証済みユーザーはメニューを更新可能
CREATE POLICY "Authenticated users can update menu items" 
ON menu_items FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- 認証済みユーザーはメニューを削除可能
CREATE POLICY "Authenticated users can delete menu items" 
ON menu_items FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------
-- 4. 更新日時自動更新トリガー
-- ---------------------------------------------

CREATE OR REPLACE FUNCTION update_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_menu_items_updated_at ON menu_items;
CREATE TRIGGER trigger_update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_items_updated_at();

-- ---------------------------------------------
-- 確認用クエリ
-- ---------------------------------------------

-- SELECT * FROM menu_items WHERE shop_id = 'ショップのUUID' ORDER BY category, sort_order;
