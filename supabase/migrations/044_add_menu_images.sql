-- 1. menu_items テーブルに image_url カラムを追加 (テーブル名は menu_items が正)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Storage バケットの作成 (menu-images)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage ポリシーの設定 (誰でも参照可能、認証済みユーザーはアップロード可能)
-- 既存のポリシーがある場合はエラーになるため、DOブロック等で制御するか、削除して再作成が安全ですが、
-- ここではシンプルに作成を試みます。エラーが出た場合は手動で調整してください。

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Authenticated Users Can Upload" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
CREATE POLICY "Users can update own images" 
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images" 
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images' AND auth.uid() = owner);
