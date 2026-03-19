-- ============================================================
-- 彦根くらしアプリ: shops テーブルに SNS URL カラムを追加
-- 作成日: 2026-03-15
-- ============================================================

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url   TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url   TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url  TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url    TEXT,
  ADD COLUMN IF NOT EXISTS website_url   TEXT;
