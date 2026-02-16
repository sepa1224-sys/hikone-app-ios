-- マンスリーミッションテーブル
CREATE TABLE IF NOT EXISTS public.monthly_missions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    mission_type TEXT NOT NULL CHECK (mission_type IN ('qr', 'photo')),
    points INTEGER NOT NULL DEFAULT 0,
    month TEXT NOT NULL, -- 'YYYY-MM' 形式
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS設定 (monthly_missions)
ALTER TABLE public.monthly_missions ENABLE ROW LEVEL SECURITY;

-- 誰でも参照可能
CREATE POLICY "Enable read access for all users" ON public.monthly_missions
    FOR SELECT USING (true);

-- 管理者のみ追加・更新・削除可能 (Service Roleキーを使用する場合)
-- 通常ユーザーは変更不可

-- ミッション提出テーブル
CREATE TABLE IF NOT EXISTS public.mission_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mission_id UUID NOT NULL REFERENCES public.monthly_missions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    image_url TEXT, -- 写真投稿の場合の画像URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, mission_id) -- 1つのミッションにつき1回のみ提出可能
);

-- RLS設定 (mission_submissions)
ALTER TABLE public.mission_submissions ENABLE ROW LEVEL SECURITY;

-- 自分の提出データのみ参照可能
CREATE POLICY "Users can view own submissions" ON public.mission_submissions
    FOR SELECT USING (auth.uid() = user_id);

-- 自分の提出データのみ作成可能
CREATE POLICY "Users can insert own submissions" ON public.mission_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storageバケット作成 (mission-photos)
-- 注意: 既に存在する場合はエラーになる可能性があるため、SQL Editorで実行する際は確認してください
INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-photos', 'mission-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storageポリシー設定
-- 画像の参照は誰でも可能 (public: true にしているため)
CREATE POLICY "Give public access to mission-photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'mission-photos');

-- 画像のアップロードは認証済みユーザーのみ可能
CREATE POLICY "Allow authenticated uploads to mission-photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'mission-photos' 
        AND auth.role() = 'authenticated'
    );

-- 自分のアップロードした画像のみ更新・削除可能 (必要に応じて)
CREATE POLICY "Users can update own mission photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'mission-photos' 
        AND auth.uid() = owner
    );

CREATE POLICY "Users can delete own mission photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'mission-photos' 
        AND auth.uid() = owner
    );
