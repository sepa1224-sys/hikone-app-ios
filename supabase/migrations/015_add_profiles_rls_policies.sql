-- =========================================
-- profiles テーブルのRLSポリシー設定
-- =========================================
-- 
-- このマイグレーションは、profilesテーブルに対して
-- Row Level Security (RLS) を有効化し、適切なポリシーを設定します。
-- これにより、ユーザーは自分のプロフィールのみを操作できるようになります。
--

-- ---------------------------------------------
-- 1. RLSの有効化
-- ---------------------------------------------

-- profiles テーブルのRLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------
-- 2. SELECTポリシー（読み取り）
-- ---------------------------------------------

-- ユーザーは自分のプロフィールのみ閲覧可能
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- ---------------------------------------------
-- 3. INSERTポリシー（挿入）
-- ---------------------------------------------

-- ユーザーは自分のプロフィールのみ挿入可能
-- id が現在のユーザーIDと一致する場合のみ許可
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ---------------------------------------------
-- 4. UPDATEポリシー（更新）
-- ---------------------------------------------

-- ユーザーは自分のプロフィールのみ更新可能
-- id が現在のユーザーIDと一致する場合のみ許可
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ---------------------------------------------
-- 5. DELETEポリシー（削除）
-- ---------------------------------------------

-- ユーザーは自分のプロフィールのみ削除可能
-- （通常は削除しないが、念のため設定）
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile" 
ON profiles FOR DELETE 
USING (auth.uid() = id);

-- ---------------------------------------------
-- 確認用クエリ（SupabaseダッシュボードのSQL Editorで実行）
-- ---------------------------------------------

-- 1. RLSポリシーの確認
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'profiles';

-- 2. RLSの有効化確認（rowsecurity が true になっていることを確認）
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'profiles';

-- 3. 現在のユーザーIDの確認（認証済みユーザーのみ実行可能）
-- SELECT auth.uid() as current_user_id;

-- 4. 自分のプロフィールの確認（認証済みユーザーのみ実行可能）
-- SELECT id, full_name, points, referral_code 
-- FROM profiles 
-- WHERE id = auth.uid();

-- ---------------------------------------------
-- トラブルシューティング
-- ---------------------------------------------
-- 
-- もしプロフィールの保存や取得ができない場合：
-- 
-- 1. RLSが有効になっているか確認
--    SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';
--    → rowsecurity が true になっていることを確認
-- 
-- 2. ポリシーが正しく作成されているか確認
--    SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
--    → 以下の4つのポリシーが存在することを確認：
--      - Users can view own profile (SELECT)
--      - Users can insert own profile (INSERT)
--      - Users can update own profile (UPDATE)
--      - Users can delete own profile (DELETE)
-- 
-- 3. 現在のユーザーIDとプロフィールのIDが一致しているか確認
--    SELECT id, full_name FROM profiles WHERE id = auth.uid();
--    → 自分のプロフィールが取得できることを確認
-- 
-- 4. エラーログを確認
--    - ブラウザのコンソールで「RLS権限エラー」や「42501」エラーコードを確認
--    - SupabaseダッシュボードのLogsでエラーを確認
--
