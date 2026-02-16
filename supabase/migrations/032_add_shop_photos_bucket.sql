-- shop-photos バケットの作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-photos', 'shop-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLSの有効化
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーの削除（再適用時用）
DROP POLICY IF EXISTS "Public Access Shop Photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Upload Shop Photos" ON storage.objects;
DROP POLICY IF EXISTS "User Update Own Shop Photos" ON storage.objects;
DROP POLICY IF EXISTS "User Delete Own Shop Photos" ON storage.objects;

-- ポリシー1: 画像の閲覧は誰でも可能
CREATE POLICY "Public Access Shop Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'shop-photos' );

-- ポリシー2: 認証済みユーザーは自分のフォルダにアップロード可能
-- ファイルパスが {user_id}/* であることを強制
CREATE POLICY "Authenticated User Upload Shop Photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー3: 自分のフォルダのファイルのみ更新可能
CREATE POLICY "User Update Own Shop Photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ポリシー4: 自分のフォルダのファイルのみ削除可能
CREATE POLICY "User Delete Own Shop Photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
