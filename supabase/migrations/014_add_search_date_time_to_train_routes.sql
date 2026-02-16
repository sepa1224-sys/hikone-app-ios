-- =====================================================
-- マイグレーション: train_routesテーブルに日時カラムを追加
-- =====================================================

-- train_routesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS train_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_station TEXT NOT NULL,
  arrival_station TEXT NOT NULL,
  route_data JSONB NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 既存のカラムが存在する場合は追加しない
  search_date TEXT,
  search_time TEXT
);

-- search_date と search_time カラムを追加（既に存在する場合はスキップ）
ALTER TABLE train_routes ADD COLUMN IF NOT EXISTS search_date TEXT;
ALTER TABLE train_routes ADD COLUMN IF NOT EXISTS search_time TEXT;

-- インデックスの作成（検索パフォーマンス向上）
-- 駅名、日付、時刻の組み合わせで検索するため、複合インデックスを作成
CREATE INDEX IF NOT EXISTS idx_train_routes_search ON train_routes(
  departure_station, 
  arrival_station, 
  search_date, 
  search_time
);

-- valid_until で有効期限をチェックするインデックス
CREATE INDEX IF NOT EXISTS idx_train_routes_valid_until ON train_routes(valid_until);

-- コメントを追加（テーブルとカラムの説明）
COMMENT ON TABLE train_routes IS '駅すぱあとAPIから取得した経路情報のキャッシュテーブル';
COMMENT ON COLUMN train_routes.departure_station IS '出発駅名';
COMMENT ON COLUMN train_routes.arrival_station IS '到着駅名';
COMMENT ON COLUMN train_routes.search_date IS '検索に使用した日付（YYYYMMDD形式）';
COMMENT ON COLUMN train_routes.search_time IS '検索に使用した時刻（HHMM形式、1分単位で厳格に保存）';
COMMENT ON COLUMN train_routes.route_data IS '経路情報のJSONデータ';
COMMENT ON COLUMN train_routes.valid_until IS 'キャッシュの有効期限';
