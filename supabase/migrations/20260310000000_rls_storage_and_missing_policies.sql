-- ============================================================
-- 彦根くらしアプリ: RLS・Storage 追加設定
-- 作成日: 2026-03-10
-- 対象: is_admin関数修正・未設定テーブルRLS・Storageバケット
-- ※ 冪等設計: 何度実行しても安全
-- ============================================================

-- ─── 0. is_admin() 関数を最新仕様に更新 ──────────────────────
-- 既存の関数は role='admin' を参照していたが
-- 実際のスキーマは is_admin boolean カラムを使用しているため修正
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_admin = true
  );
END;
$$;

-- ─── 1. profiles ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 旧ポリシー削除
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
-- 新ポリシー削除（再実行時の重複防止）
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE
  USING (is_admin());


-- ─── 2. point_history ────────────────────────────────────────
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own point history" ON point_history;
DROP POLICY IF EXISTS "Users can insert own point history" ON point_history;
DROP POLICY IF EXISTS "point_history_select" ON point_history;
DROP POLICY IF EXISTS "point_history_insert" ON point_history;
DROP POLICY IF EXISTS "point_history_admin_update" ON point_history;
DROP POLICY IF EXISTS "point_history_admin_delete" ON point_history;

CREATE POLICY "point_history_select"
  ON point_history FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "point_history_insert"
  ON point_history FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "point_history_admin_update"
  ON point_history FOR UPDATE
  USING (is_admin());

CREATE POLICY "point_history_admin_delete"
  ON point_history FOR DELETE
  USING (is_admin());


-- ─── 3. friends ──────────────────────────────────────────────
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own friends" ON friends;
DROP POLICY IF EXISTS "Users can add own friends" ON friends;
DROP POLICY IF EXISTS "Users can delete own friends" ON friends;
DROP POLICY IF EXISTS "friends_select" ON friends;
DROP POLICY IF EXISTS "friends_insert" ON friends;
DROP POLICY IF EXISTS "friends_delete" ON friends;

CREATE POLICY "friends_select"
  ON friends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "friends_insert"
  ON friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "friends_delete"
  ON friends FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 4. gift_exchange_requests ───────────────────────────────
ALTER TABLE gift_exchange_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own gift requests" ON gift_exchange_requests;
DROP POLICY IF EXISTS "Users can insert own gift requests" ON gift_exchange_requests;
DROP POLICY IF EXISTS "Admins can manage all gift requests" ON gift_exchange_requests;
DROP POLICY IF EXISTS "gift_requests_select" ON gift_exchange_requests;
DROP POLICY IF EXISTS "gift_requests_insert" ON gift_exchange_requests;
DROP POLICY IF EXISTS "gift_requests_admin_update" ON gift_exchange_requests;
DROP POLICY IF EXISTS "gift_requests_admin_delete" ON gift_exchange_requests;

CREATE POLICY "gift_requests_select"
  ON gift_exchange_requests FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "gift_requests_insert"
  ON gift_exchange_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gift_requests_admin_update"
  ON gift_exchange_requests FOR UPDATE
  USING (is_admin());

CREATE POLICY "gift_requests_admin_delete"
  ON gift_exchange_requests FOR DELETE
  USING (is_admin());


-- ─── 5. shops ────────────────────────────────────────────────
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on shops" ON shops;
DROP POLICY IF EXISTS "Owners can update their own shop" ON shops;
DROP POLICY IF EXISTS "shops_select" ON shops;
DROP POLICY IF EXISTS "shops_owner_update" ON shops;
DROP POLICY IF EXISTS "shops_admin_all" ON shops;

-- 全員閲覧可（店舗一覧表示）
CREATE POLICY "shops_select"
  ON shops FOR SELECT
  USING (true);

-- オーナーは自分の店舗を更新可能
CREATE POLICY "shops_owner_update"
  ON shops FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 管理者は全操作可能
CREATE POLICY "shops_admin_all"
  ON shops FOR ALL
  USING (is_admin());


-- ─── 6. contacts ─────────────────────────────────────────────
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_admin_select" ON contacts;
DROP POLICY IF EXISTS "contacts_admin_delete" ON contacts;

CREATE POLICY "contacts_insert"
  ON contacts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "contacts_admin_select"
  ON contacts FOR SELECT
  USING (is_admin());

CREATE POLICY "contacts_admin_delete"
  ON contacts FOR DELETE
  USING (is_admin());


-- ─── 7. posts ────────────────────────────────────────────────
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "posts_select" ON posts;
DROP POLICY IF EXISTS "posts_insert" ON posts;
DROP POLICY IF EXISTS "posts_owner_or_admin_delete" ON posts;

CREATE POLICY "posts_select"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "posts_insert"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_owner_or_admin_delete"
  ON posts FOR DELETE
  USING (auth.uid() = user_id OR is_admin());


-- ─── 8. item_box ─────────────────────────────────────────────
ALTER TABLE item_box ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own items" ON item_box;
DROP POLICY IF EXISTS "Users can insert own items" ON item_box;
DROP POLICY IF EXISTS "Users can update own items" ON item_box;
DROP POLICY IF EXISTS "Users can delete own items" ON item_box;
DROP POLICY IF EXISTS "item_box_select" ON item_box;
DROP POLICY IF EXISTS "item_box_insert" ON item_box;
DROP POLICY IF EXISTS "item_box_update" ON item_box;
DROP POLICY IF EXISTS "item_box_delete" ON item_box;

CREATE POLICY "item_box_select"
  ON item_box FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "item_box_insert"
  ON item_box FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "item_box_update"
  ON item_box FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "item_box_delete"
  ON item_box FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 9. Storage: avatarsバケット ─────────────────────────────
-- 既存ポリシー削除（旧名・新名ともに）
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

-- パブリック読み取り（アバター画像は公開）
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 認証済みユーザーは自分のフォルダにアップロード可能
-- ファイルパス形式: avatars/{user_id}/{filename}
CREATE POLICY "avatars_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分のアバターのみ更新可能
CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 自分のアバターのみ削除可能
CREATE POLICY "avatars_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatarsバケットをパブリックに設定（未設定の場合）
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';
