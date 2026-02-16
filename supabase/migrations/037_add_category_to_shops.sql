-- shopsテーブルにcategoryカラムを追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS category TEXT;
