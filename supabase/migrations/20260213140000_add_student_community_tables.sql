-- =========================================
-- 学生コミュニティ機能用テーブル・カラム追加
-- =========================================

-- 1. schools テーブル（学校マスター）の作成
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('high_school', 'university')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLSポリシー
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
-- 誰でも参照可能
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);
-- 管理者のみ作成・更新可能 (既存のis_admin関数を使用)
CREATE POLICY "Admins can insert schools" ON schools FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update schools" ON schools FOR UPDATE USING (is_admin());

-- 2. profiles テーブルの拡張
-- is_student, school_id, grade カラムの追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_student BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade INTEGER CHECK (grade BETWEEN 1 AND 6);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_student ON profiles(is_student);

-- 3. activity_logs テーブル（活動履歴）の作成
-- ランニング等の活動記録用（ランキング集計の元データ）
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('run', 'walk')),
  distance NUMERIC(10, 2) NOT NULL DEFAULT 0, -- 距離(km)
  duration INTEGER NOT NULL DEFAULT 0, -- 時間(秒)
  calories INTEGER DEFAULT 0,
  steps INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_school_ranking ON activity_logs(activity_type, created_at);

-- RLSポリシー
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
-- 自分のデータのみ参照可能（ランキング集計はService RoleまたはSecurity Definer関数で行う想定）
CREATE POLICY "Users can view own activity logs" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
-- 自分のデータのみ作成可能
CREATE POLICY "Users can insert own activity logs" ON activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 初期データ投入（サンプル）
INSERT INTO schools (name, type) VALUES 
('滋賀大学', 'university'),
('滋賀県立大学', 'university'),
('聖泉大学', 'university'),
('彦根総合高等学校', 'high_school'),
('近江高等学校', 'high_school'),
('彦根東高等学校', 'high_school'),
('彦根工業高等学校', 'high_school'),
('彦根翔西館高等学校', 'high_school'),
('河瀬高等学校', 'high_school');
