-- =========================================
-- ユーザー属性の追加 (大学生/高校生など)
-- =========================================

-- 1. profiles テーブルにカラムを追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT, -- '大学生', '高校生', '専門学生', '社会人', 'その他'
ADD COLUMN IF NOT EXISTS university_name TEXT, -- 大学名
ADD COLUMN IF NOT EXISTS school_name TEXT, -- 学校名（大学以外）
ADD COLUMN IF NOT EXISTS grade TEXT; -- 学年

-- 2. インデックスの作成（検索・集計用）
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_university_name ON profiles(university_name);
CREATE INDEX IF NOT EXISTS idx_profiles_grade ON profiles(grade);

-- 3. コメント
COMMENT ON COLUMN profiles.user_type IS 'ユーザー区分（大学生/高校生など）';
COMMENT ON COLUMN profiles.university_name IS '大学名';
COMMENT ON COLUMN profiles.school_name IS '学校名';
COMMENT ON COLUMN profiles.grade IS '学年';
