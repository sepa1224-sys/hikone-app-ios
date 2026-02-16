-- 1. menu_items の RLS を一時的に無効化 (テスト用)
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;

-- 2. スキーマキャッシュのリロード (PGRST204対策)
NOTIFY pgrst, 'reload schema';

-- 3. menus テーブルが存在するか確認 (念のため、誤って作成されている場合は削除または統合を検討)
-- ここでは存在確認のみコメントに残しますが、menu_items が正です。

-- 4. category カラムの存在確認と修正 (念のため)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'category') THEN
        ALTER TABLE menu_items ADD COLUMN category VARCHAR(50) DEFAULT 'other';
    END IF;
END $$;
