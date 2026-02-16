-- =====================================================
-- イベント・フォトコンテスト用テーブル
-- =====================================================

-- 1. events テーブル（イベント情報）
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prize_amount INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. event_submissions テーブル（ユーザー投稿）
CREATE TABLE IF NOT EXISTS event_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'winner')),
  admin_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じユーザーが同じイベントに複数回投稿できないようにする
  UNIQUE(event_id, user_id)
);

-- 3. インデックス
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_submissions_event ON event_submissions(event_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON event_submissions(user_id);

-- 4. RLS（Row Level Security）設定
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_submissions ENABLE ROW LEVEL SECURITY;

-- events は誰でも閲覧可能
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (true);

-- event_submissions は本人のみ閲覧・作成可能
CREATE POLICY "Users can view their own submissions" ON event_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions" ON event_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Supabase Storage バケット設定（管理画面で実行）
-- Storage > New Bucket > Name: event-photos > Public: ON

-- 6. サンプルデータ
INSERT INTO events (title, description, prize_amount, start_date, end_date, location, status)
VALUES 
  (
    '彦根城 冬の絶景フォトコンテスト',
    '雪化粧の彦根城、冬の琵琶湖、イルミネーションなど、彦根の冬の魅力を写真に収めてください！',
    5000,
    '2026-01-01',
    '2026-02-28',
    '彦根市内',
    'active'
  ),
  (
    'ひこにゃんベストショット',
    'ひこにゃんの可愛い瞬間を撮影！毎月優秀作品を表彰します。',
    3000,
    '2026-01-01',
    '2026-12-31',
    '彦根城周辺',
    'active'
  );
