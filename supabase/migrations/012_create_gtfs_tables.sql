-- =====================================================
-- マイグレーション: GTFSデータ用テーブル作成
-- =====================================================
-- 
-- 滋賀、京都、大阪、愛知、福井の広域GTFSデータを扱うためのテーブル構造
-- 複数のGTFSフィードを区別するために feed_id カラムを追加

-- =====================================================
-- 1. stops テーブル（停留所情報）
-- =====================================================
CREATE TABLE IF NOT EXISTS gtfs_stops (
  id BIGSERIAL PRIMARY KEY,
  feed_id VARCHAR(100) NOT NULL,  -- GTFSフィード識別子（例: 'shiga', 'kyoto', 'osaka'）
  stop_id VARCHAR(255) NOT NULL,  -- GTFSのstop_id（フィード内で一意）
  stop_code VARCHAR(100),
  stop_name VARCHAR(255) NOT NULL,
  stop_desc TEXT,
  stop_lat DECIMAL(10, 8) NOT NULL,  -- 緯度
  stop_lon DECIMAL(11, 8) NOT NULL,  -- 経度
  zone_id VARCHAR(100),
  stop_url TEXT,
  location_type INTEGER DEFAULT 0,  -- 0: 停留所, 1: 駅, 2: 出入口など
  parent_station VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 同じフィード内でstop_idは一意
  UNIQUE(feed_id, stop_id)
);

-- 緯度経度での検索用インデックス（最寄り駅検索用）
-- earthdistance拡張を使用して距離計算を高速化
CREATE INDEX IF NOT EXISTS idx_gtfs_stops_location ON gtfs_stops(stop_lat, stop_lon);

-- フィードIDとstop_idでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_gtfs_stops_feed_stop ON gtfs_stops(feed_id, stop_id);

-- 駅名での検索用インデックス
CREATE INDEX IF NOT EXISTS idx_gtfs_stops_name ON gtfs_stops(stop_name);

-- =====================================================
-- 2. routes テーブル（路線情報）
-- =====================================================
CREATE TABLE IF NOT EXISTS gtfs_routes (
  id BIGSERIAL PRIMARY KEY,
  feed_id VARCHAR(100) NOT NULL,
  route_id VARCHAR(255) NOT NULL,  -- GTFSのroute_id（フィード内で一意）
  agency_id VARCHAR(255),
  route_short_name VARCHAR(100),
  route_long_name VARCHAR(255) NOT NULL,
  route_desc TEXT,
  route_type INTEGER NOT NULL,  -- 0: 路面電車, 1: 地下鉄, 2: 鉄道など
  route_url TEXT,
  route_color VARCHAR(6),  -- 16進数カラーコード（例: 'FF0000'）
  route_text_color VARCHAR(6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 同じフィード内でroute_idは一意
  UNIQUE(feed_id, route_id)
);

-- フィードIDとroute_idでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_gtfs_routes_feed_route ON gtfs_routes(feed_id, route_id);

-- =====================================================
-- 3. trips テーブル（運行パターン情報）
-- =====================================================
CREATE TABLE IF NOT EXISTS gtfs_trips (
  id BIGSERIAL PRIMARY KEY,
  feed_id VARCHAR(100) NOT NULL,
  route_id VARCHAR(255) NOT NULL,
  service_id VARCHAR(255) NOT NULL,  -- 運行カレンダーID（平日/休日など）
  trip_id VARCHAR(255) NOT NULL,  -- GTFSのtrip_id（フィード内で一意）
  trip_headsign VARCHAR(255),  -- 行先表示
  trip_short_name VARCHAR(100),
  direction_id INTEGER,  -- 0: 上り/外回り, 1: 下り/内回り
  block_id VARCHAR(255),
  shape_id VARCHAR(255),
  wheelchair_accessible INTEGER,  -- 0: 不明, 1: 可能, 2: 不可
  bikes_allowed INTEGER,  -- 0: 不明, 1: 可能, 2: 不可
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 同じフィード内でtrip_idは一意
  UNIQUE(feed_id, trip_id),
  -- 外部キー制約（routesテーブル参照）
  FOREIGN KEY (feed_id, route_id) REFERENCES gtfs_routes(feed_id, route_id) ON DELETE CASCADE
);

-- フィードIDとtrip_idでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_gtfs_trips_feed_trip ON gtfs_trips(feed_id, trip_id);

-- route_idでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_gtfs_trips_route ON gtfs_trips(feed_id, route_id);

-- service_idでの検索用インデックス（運行カレンダー検索用）
CREATE INDEX IF NOT EXISTS idx_gtfs_trips_service ON gtfs_trips(feed_id, service_id);

-- =====================================================
-- 4. stop_times テーブル（停留所時刻情報）
-- =====================================================
CREATE TABLE IF NOT EXISTS gtfs_stop_times (
  id BIGSERIAL PRIMARY KEY,
  feed_id VARCHAR(100) NOT NULL,
  trip_id VARCHAR(255) NOT NULL,
  arrival_time TIME,  -- 到着時刻（NULL可: 最初/最後の停留所）
  departure_time TIME NOT NULL,  -- 出発時刻
  stop_id VARCHAR(255) NOT NULL,
  stop_sequence INTEGER NOT NULL,  -- 停留所の順序
  stop_headsign VARCHAR(255),
  pickup_type INTEGER DEFAULT 0,  -- 0: 通常, 1: なし, 2: 電話予約, 3: 運転手に確認
  drop_off_type INTEGER DEFAULT 0,  -- 0: 通常, 1: なし, 2: 電話予約, 3: 運転手に確認
  shape_dist_traveled DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 外部キー制約
  FOREIGN KEY (feed_id, trip_id) REFERENCES gtfs_trips(feed_id, trip_id) ON DELETE CASCADE,
  FOREIGN KEY (feed_id, stop_id) REFERENCES gtfs_stops(feed_id, stop_id) ON DELETE CASCADE
);

-- 出発時刻検索用インデックス（最重要）
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_departure ON gtfs_stop_times(feed_id, stop_id, departure_time);

-- trip_idでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_trip ON gtfs_stop_times(feed_id, trip_id);

-- stop_idと出発時刻での複合インデックス（最寄り駅検索用）
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_stop_departure ON gtfs_stop_times(feed_id, stop_id, departure_time);

-- =====================================================
-- 5. 補助テーブル: calendar（運行カレンダー）
-- =====================================================
-- 平日/休日の判定に使用
CREATE TABLE IF NOT EXISTS gtfs_calendar (
  id BIGSERIAL PRIMARY KEY,
  feed_id VARCHAR(100) NOT NULL,
  service_id VARCHAR(255) NOT NULL,
  monday INTEGER NOT NULL DEFAULT 0,  -- 0 or 1
  tuesday INTEGER NOT NULL DEFAULT 0,
  wednesday INTEGER NOT NULL DEFAULT 0,
  thursday INTEGER NOT NULL DEFAULT 0,
  friday INTEGER NOT NULL DEFAULT 0,
  saturday INTEGER NOT NULL DEFAULT 0,
  sunday INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,  -- 開始日（YYYYMMDD形式から変換）
  end_date DATE NOT NULL,  -- 終了日（YYYYMMDD形式から変換）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feed_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_gtfs_calendar_service ON gtfs_calendar(feed_id, service_id);

-- =====================================================
-- 6. 拡張機能の有効化（距離計算用）
-- =====================================================
-- 緯度経度での距離計算用（earthdistance拡張）
-- Supabaseでは既に有効化されている可能性があるが、念のため
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- =====================================================
-- 7. 更新日時の自動更新トリガー
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gtfs_stops_updated_at BEFORE UPDATE ON gtfs_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gtfs_routes_updated_at BEFORE UPDATE ON gtfs_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gtfs_trips_updated_at BEFORE UPDATE ON gtfs_trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gtfs_stop_times_updated_at BEFORE UPDATE ON gtfs_stop_times
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gtfs_calendar_updated_at BEFORE UPDATE ON gtfs_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
