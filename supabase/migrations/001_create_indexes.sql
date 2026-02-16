-- =========================================
-- パフォーマンス最適化用インデックス
-- =========================================
-- 
-- Supabase のダッシュボード > SQL Editor で実行してください
-- または、Supabase CLI を使用している場合は自動適用されます
--
-- インデックスにより、area_key での検索が O(n) → O(log n) に改善されます

-- ---------------------------------------------
-- 1. hikone_waste_master テーブルのインデックス
-- ---------------------------------------------

-- area_key での完全一致検索用インデックス
-- 例: .eq('area_key', '城南・城陽...')
CREATE INDEX IF NOT EXISTS idx_hikone_waste_master_area_key 
ON hikone_waste_master (area_key);

-- area_key での部分一致（ILIKE）検索用GINインデックス
-- 例: .ilike('area_key', '%城南%')
-- pg_trgm 拡張が必要（Supabase ではデフォルトで有効）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_hikone_waste_master_area_key_trgm 
ON hikone_waste_master 
USING GIN (area_key gin_trgm_ops);

-- ---------------------------------------------
-- 2. profiles テーブルのインデックス
-- ---------------------------------------------

-- selected_area での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_selected_area 
ON profiles (selected_area);

-- city での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_city 
ON profiles (city);

-- user_id での検索用インデックス（既に主キーなら不要）
-- CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
-- ON profiles (user_id);

-- ---------------------------------------------
-- 3. contacts テーブルのインデックス
-- ---------------------------------------------

-- カテゴリ別フィルタリング用
CREATE INDEX IF NOT EXISTS idx_contacts_category 
ON contacts (category);

-- 日付順ソート用
CREATE INDEX IF NOT EXISTS idx_contacts_created_at 
ON contacts (created_at DESC);

-- ---------------------------------------------
-- インデックス確認用クエリ
-- ---------------------------------------------
-- 以下のクエリでインデックスが正しく作成されたか確認できます：
--
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'hikone_waste_master';
--
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'profiles';

-- ---------------------------------------------
-- パフォーマンス計測用クエリ（オプション）
-- ---------------------------------------------
-- EXPLAIN ANALYZE 
-- SELECT area_key, burnable, cans_and_metal, glass_bottles, pet_bottles, landfill_waste
-- FROM hikone_waste_master 
-- WHERE area_key = '城南・城陽...';
