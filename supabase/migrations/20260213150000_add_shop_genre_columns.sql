-- 店舗のジャンル詳細情報を追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS category_sub TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS meal_type TEXT;

-- category_main は既存ですが、念のため確認（なければ追加）
ALTER TABLE shops ADD COLUMN IF NOT EXISTS category_main TEXT;

-- インデックスの作成（検索高速化のため）
CREATE INDEX IF NOT EXISTS idx_shops_category_main ON shops(category_main);
CREATE INDEX IF NOT EXISTS idx_shops_meal_type ON shops(meal_type);
