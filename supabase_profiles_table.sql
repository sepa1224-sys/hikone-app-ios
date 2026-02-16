-- ========================================
-- Supabase マーケティング・分析用 profiles テーブル作成SQL
-- ========================================

-- 1. profiles テーブルの作成
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('男性', '女性', 'その他', '回答しない')),
  age_range TEXT CHECK (age_range IN ('10代', '20代', '30代', '40代', '50代', '60代', '70代以上')),
  residence TEXT CHECK (residence IN ('県内', '県外', '海外')),
  interests TEXT[] DEFAULT '{}',
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS (Row Level Security) の有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLSポリシーの設定
-- ユーザーは自分のプロフィールのみ閲覧・更新可能
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS profiles_residence_idx ON public.profiles(residence);
CREATE INDEX IF NOT EXISTS profiles_age_range_idx ON public.profiles(age_range);
CREATE INDEX IF NOT EXISTS profiles_interests_idx ON public.profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS profiles_last_login_idx ON public.profiles(last_login);

-- 5. updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- ユーザー登録時に自動でprofilesレコードを作成するトリガー
-- ========================================

-- 6. 新規ユーザー登録時にプロフィールを作成する関数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, last_login)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. auth.users テーブルにトリガーを設定
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 8. last_login を更新する関数（ログイン時に呼び出す用）
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================== 
-- 補足: 既存ユーザーがいる場合のマイグレーション用SQL
-- ========================================

-- 既存のauth.usersにプロフィールがない場合のみ作成
-- INSERT INTO public.profiles (id, full_name, avatar_url, last_login)
-- SELECT 
--   id,
--   COALESCE(raw_user_meta_data->>'full_name', NULL) as full_name,
--   COALESCE(raw_user_meta_data->>'avatar_url', NULL) as avatar_url,
--   NOW() as last_login
-- FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.profiles)
-- ON CONFLICT (id) DO NOTHING;

-- ========================================
-- prefecture と city カラムの追加（既存テーブルへのマイグレーション）
-- ========================================

-- prefectureカラムの追加（既存テーブルへのマイグレーション）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS prefecture TEXT;

-- cityカラムの追加（既存テーブルへのマイグレーション）
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city TEXT;

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS profiles_prefecture_idx ON public.profiles(prefecture);
CREATE INDEX IF NOT EXISTS profiles_city_idx ON public.profiles(city);

-- コメントの追加
COMMENT ON COLUMN public.profiles.prefecture IS '都道府県';
COMMENT ON COLUMN public.profiles.city IS '市区町村・地域名';

-- ========================================
-- コメント（オプション）
-- ========================================

COMMENT ON TABLE public.profiles IS 'ユーザープロフィール・マーケティング分析用テーブル';
COMMENT ON COLUMN public.profiles.id IS 'auth.usersのidと連携';
COMMENT ON COLUMN public.profiles.full_name IS 'ユーザーの姓名';
COMMENT ON COLUMN public.profiles.avatar_url IS 'プロフィール画像URL';
COMMENT ON COLUMN public.profiles.gender IS '性別';
COMMENT ON COLUMN public.profiles.age_range IS '年代';
COMMENT ON COLUMN public.profiles.residence IS '居住地';
COMMENT ON COLUMN public.profiles.interests IS '興味関心（配列形式）';
COMMENT ON COLUMN public.profiles.last_login IS '最終ログイン日時';
