-- =====================================================
-- マイグレーション: GTFS検索用関数とSQLクエリ
-- =====================================================

-- =====================================================
-- 1. 最寄り駅検索関数（RPC）
-- =====================================================
-- 指定した座標から最寄りの停留所を検索する関数

CREATE OR REPLACE FUNCTION find_nearest_stops(
  lat_param DECIMAL,
  lon_param DECIMAL,
  radius_km DECIMAL DEFAULT 5.0,
  limit_param INTEGER DEFAULT 1
)
RETURNS TABLE (
  stop_id VARCHAR,
  stop_name VARCHAR,
  stop_lat DECIMAL,
  stop_lon DECIMAL,
  feed_id VARCHAR,
  distance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.stop_id,
    s.stop_name,
    s.stop_lat,
    s.stop_lon,
    s.feed_id,
    (earth_distance(
      ll_to_earth(s.stop_lat, s.stop_lon),
      ll_to_earth(lat_param, lon_param)
    ) / 1000.0) AS distance
  FROM gtfs_stops s
  WHERE 
    earth_distance(
      ll_to_earth(s.stop_lat, s.stop_lon),
      ll_to_earth(lat_param, lon_param)
    ) <= radius_km * 1000  -- 半径をメートルに変換
  ORDER BY distance ASC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. 直近の出発便検索SQLクエリ（サンプル）
-- =====================================================
-- 以下のクエリは、指定した停留所から直近の出発便を検索します

-- 例: 停留所ID 'STOP001' から直近10本の出発便を検索
/*
SELECT 
  st.stop_id,
  s.stop_name,
  st.departure_time,
  t.trip_id,
  t.route_id,
  COALESCE(r.route_short_name, r.route_long_name) AS route_name,
  t.trip_headsign,
  t.direction_id,
  st.feed_id
FROM gtfs_stop_times st
INNER JOIN gtfs_stops s ON st.feed_id = s.feed_id AND st.stop_id = s.stop_id
INNER JOIN gtfs_trips t ON st.feed_id = t.feed_id AND st.trip_id = t.trip_id
INNER JOIN gtfs_routes r ON t.feed_id = r.feed_id AND t.route_id = r.route_id
WHERE 
  st.feed_id = 'shiga'  -- フィードIDを指定
  AND st.stop_id = 'STOP001'  -- 停留所IDを指定
  AND st.departure_time >= CURRENT_TIME  -- 現在時刻以降
ORDER BY st.departure_time ASC
LIMIT 10;
*/

-- =====================================================
-- 3. 2つの座標から最寄り駅を特定し、直近の出発便を検索するSQLクエリ
-- =====================================================
-- このクエリは、出発地点と到着地点の座標から最寄り駅を特定し、
-- 出発駅から直近の出発便を検索します

-- 例: 出発地点 (35.2700, 136.2600) から到着地点 (35.0100, 135.7700) への経路検索
/*
WITH nearest_from_stop AS (
  -- 出発地点の最寄り駅を検索
  SELECT 
    stop_id,
    stop_name,
    stop_lat,
    stop_lon,
    feed_id,
    (earth_distance(
      ll_to_earth(stop_lat, stop_lon),
      ll_to_earth(35.2700, 136.2600)  -- 出発地点の座標
    ) / 1000.0) AS distance
  FROM gtfs_stops
  WHERE 
    earth_distance(
      ll_to_earth(stop_lat, stop_lon),
      ll_to_earth(35.2700, 136.2600)
    ) <= 5000  -- 5km以内
  ORDER BY distance ASC
  LIMIT 1
),
nearest_to_stop AS (
  -- 到着地点の最寄り駅を検索
  SELECT 
    stop_id,
    stop_name,
    stop_lat,
    stop_lon,
    feed_id,
    (earth_distance(
      ll_to_earth(stop_lat, stop_lon),
      ll_to_earth(35.0100, 135.7700)  -- 到着地点の座標
    ) / 1000.0) AS distance
  FROM gtfs_stops
  WHERE 
    earth_distance(
      ll_to_earth(stop_lat, stop_lon),
      ll_to_earth(35.0100, 135.7700)
    ) <= 5000  -- 5km以内
  ORDER BY distance ASC
  LIMIT 1
)
SELECT 
  nfs.stop_id AS from_stop_id,
  nfs.stop_name AS from_stop_name,
  nfs.distance AS from_distance_km,
  nts.stop_id AS to_stop_id,
  nts.stop_name AS to_stop_name,
  nts.distance AS to_distance_km,
  st.departure_time,
  t.trip_id,
  t.route_id,
  COALESCE(r.route_short_name, r.route_long_name) AS route_name,
  t.trip_headsign,
  t.direction_id,
  st.feed_id
FROM nearest_from_stop nfs
CROSS JOIN nearest_to_stop nts
INNER JOIN gtfs_stop_times st ON nfs.feed_id = st.feed_id AND nfs.stop_id = st.stop_id
INNER JOIN gtfs_trips t ON st.feed_id = t.feed_id AND st.trip_id = t.trip_id
INNER JOIN gtfs_routes r ON t.feed_id = r.feed_id AND t.route_id = r.route_id
WHERE 
  st.departure_time >= CURRENT_TIME  -- 現在時刻以降
ORDER BY st.departure_time ASC
LIMIT 10;
*/

-- =====================================================
-- 4. 運行カレンダーを考慮した出発便検索（平日/休日判定）
-- =====================================================
-- 現在の曜日と日付に基づいて、有効なservice_idを判定し、
-- そのservice_idに該当する便のみを検索します

-- 例: 運行カレンダーを考慮した出発便検索
/*
WITH current_service_ids AS (
  -- 現在の日付と曜日に該当するservice_idを取得
  SELECT DISTINCT service_id, feed_id
  FROM gtfs_calendar
  WHERE 
    feed_id = 'shiga'
    AND start_date <= CURRENT_DATE
    AND end_date >= CURRENT_DATE
    AND (
      (EXTRACT(DOW FROM CURRENT_DATE) = 0 AND sunday = 1) OR
      (EXTRACT(DOW FROM CURRENT_DATE) = 1 AND monday = 1) OR
      (EXTRACT(DOW FROM CURRENT_DATE) = 2 AND tuesday = 1) OR
      (EXTRACT(DOW FROM CURRENT_DATE) = 3 AND wednesday = 1) OR
      (EXTRACT(DOW FROM CURRENT_DATE) = 4 AND thursday = 1) OR
      (EXTRACT(DOW FROM CURRENT_DATE) = 5 AND friday = 1) OR
      (EXTRACT(DOW FROM CURRENT_DATE) = 6 AND saturday = 1)
    )
)
SELECT 
  st.stop_id,
  s.stop_name,
  st.departure_time,
  t.trip_id,
  t.route_id,
  COALESCE(r.route_short_name, r.route_long_name) AS route_name,
  t.trip_headsign,
  t.direction_id,
  st.feed_id
FROM gtfs_stop_times st
INNER JOIN gtfs_stops s ON st.feed_id = s.feed_id AND st.stop_id = s.stop_id
INNER JOIN gtfs_trips t ON st.feed_id = t.feed_id AND st.trip_id = t.trip_id
INNER JOIN gtfs_routes r ON t.feed_id = r.feed_id AND t.route_id = r.route_id
INNER JOIN current_service_ids csi ON t.feed_id = csi.feed_id AND t.service_id = csi.service_id
WHERE 
  st.feed_id = 'shiga'
  AND st.stop_id = 'STOP001'
  AND st.departure_time >= CURRENT_TIME
ORDER BY st.departure_time ASC
LIMIT 10;
*/

-- =====================================================
-- 5. 複数フィードを横断した検索（全地域統合検索）
-- =====================================================
-- 複数のGTFSフィード（滋賀、京都、大阪、愛知、福井）を横断して
-- 最寄り駅を検索し、出発便を取得します

-- 例: 全フィードから最寄り駅を検索
/*
SELECT 
  stop_id,
  stop_name,
  stop_lat,
  stop_lon,
  feed_id,
  (earth_distance(
    ll_to_earth(stop_lat, stop_lon),
    ll_to_earth(35.2700, 136.2600)  -- 指定座標
  ) / 1000.0) AS distance_km
FROM gtfs_stops
WHERE 
  feed_id IN ('shiga', 'kyoto', 'osaka', 'aichi', 'fukui')  -- 複数フィード
  AND earth_distance(
    ll_to_earth(stop_lat, stop_lon),
    ll_to_earth(35.2700, 136.2600)
  ) <= 10000  -- 10km以内
ORDER BY distance_km ASC
LIMIT 5;
*/

-- =====================================================
-- 6. パフォーマンス最適化用の追加インデックス
-- =====================================================
-- 検索クエリのパフォーマンス向上のため、必要に応じて追加

-- 複合インデックス: feed_id + stop_id + departure_time
-- （既に作成済み: idx_gtfs_stop_times_stop_departure）

-- フィードIDでの検索を高速化
CREATE INDEX IF NOT EXISTS idx_gtfs_stops_feed_id ON gtfs_stops(feed_id);
CREATE INDEX IF NOT EXISTS idx_gtfs_stop_times_feed_id ON gtfs_stop_times(feed_id);
