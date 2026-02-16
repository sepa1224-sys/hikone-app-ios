-- Storage バケットの作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-photos', 'mission-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLSの有効化
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（重複防止）
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Upload" ON storage.objects;
DROP POLICY IF EXISTS "User Update Own Objects" ON storage.objects;
DROP POLICY IF EXISTS "User Delete Own Objects" ON storage.objects;

-- ポリシー1: 画像の閲覧は誰でも可能
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'mission-photos' );

-- ポリシー2: 認証済みユーザーはアップロード可能
-- (自分のフォルダ {user_id}/* にのみアップロード可能とするのがベストだが、
--  簡易的に認証済みユーザーならアップロード可とする)
CREATE POLICY "Authenticated User Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'mission-photos' );

-- ポリシー3: 自分のアップロードしたファイルのみ更新可能
CREATE POLICY "User Update Own Objects"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'mission-photos' AND owner = auth.uid() );

-- ポリシー4: 自分のアップロードしたファイルのみ削除可能
CREATE POLICY "User Delete Own Objects"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'mission-photos' AND owner = auth.uid() );
