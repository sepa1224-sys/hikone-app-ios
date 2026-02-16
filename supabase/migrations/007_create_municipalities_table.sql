-- 自治体マスターテーブル
-- 人口データや統計情報を管理

CREATE TABLE IF NOT EXISTS municipalities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture VARCHAR(50) NOT NULL,           -- 都道府県名
  city VARCHAR(100) NOT NULL,                -- 市区町村名
  population INTEGER,                        -- 最新人口
  population_updated_at DATE,                -- 人口データの更新日
  area_km2 DECIMAL(10,2),                    -- 面積（km²）
  postal_code VARCHAR(10),                   -- 郵便番号（代表）
  latitude DECIMAL(10,6),                    -- 緯度（市役所等の代表地点）
  longitude DECIMAL(10,6),                   -- 経度
  mascot_name VARCHAR(100),                  -- ゆるキャラ名
  official_url VARCHAR(500),                 -- 公式サイトURL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- ユニーク制約：都道府県+市区町村名
  UNIQUE(prefecture, city)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_municipalities_prefecture ON municipalities(prefecture);
CREATE INDEX IF NOT EXISTS idx_municipalities_city ON municipalities(city);
CREATE INDEX IF NOT EXISTS idx_municipalities_pref_city ON municipalities(prefecture, city);

-- RLS有効化
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "municipalities_select_policy" ON municipalities
  FOR SELECT USING (true);

-- 認証済みユーザーのみ更新可能（管理者用）
CREATE POLICY "municipalities_update_policy" ON municipalities
  FOR UPDATE TO authenticated USING (true);

-- 認証済みユーザーのみ挿入可能（管理者用）
CREATE POLICY "municipalities_insert_policy" ON municipalities
  FOR INSERT TO authenticated WITH CHECK (true);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_municipalities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_municipalities_updated_at
  BEFORE UPDATE ON municipalities
  FOR EACH ROW
  EXECUTE FUNCTION update_municipalities_updated_at();

-- 初期データ: 滋賀県の主要市町村
INSERT INTO municipalities (prefecture, city, population, population_updated_at, area_km2, mascot_name, official_url) VALUES
  ('滋賀県', '彦根市', 113000, '2024-01-01', 196.87, 'ひこにゃん', 'https://www.city.hikone.lg.jp/'),
  ('滋賀県', '大津市', 345000, '2024-01-01', 464.51, 'おおつ光ルくん', 'https://www.city.otsu.lg.jp/'),
  ('滋賀県', '長浜市', 115000, '2024-01-01', 681.02, '三成くん', 'https://www.city.nagahama.lg.jp/'),
  ('滋賀県', '草津市', 147000, '2024-01-01', 67.82, 'たび丸', 'https://www.city.kusatsu.shiga.jp/'),
  ('滋賀県', '近江八幡市', 81000, '2024-01-01', 177.45, 'はちまんくん', 'https://www.city.omihachiman.lg.jp/'),
  ('滋賀県', '守山市', 86000, '2024-01-01', 55.74, 'もりやまるくん', 'https://www.city.moriyama.lg.jp/'),
  ('滋賀県', '栗東市', 71000, '2024-01-01', 52.69, 'くりちゃん', 'https://www.city.ritto.lg.jp/'),
  ('滋賀県', '甲賀市', 88000, '2024-01-01', 481.62, 'にんじゃえもん', 'https://www.city.koka.lg.jp/'),
  ('滋賀県', '野洲市', 51000, '2024-01-01', 80.14, 'ドウタクくん', 'https://www.city.yasu.lg.jp/'),
  ('滋賀県', '湖南市', 55000, '2024-01-01', 70.40, 'こにゃん', 'https://www.city.konan.lg.jp/'),
  ('滋賀県', '東近江市', 113000, '2024-01-01', 388.37, 'がくとくん', 'https://www.city.higashiomi.shiga.jp/'),
  ('滋賀県', '米原市', 37000, '2024-01-01', 250.39, 'ホタルン', 'https://www.city.maibara.lg.jp/'),
  ('滋賀県', '日野町', 21000, '2024-01-01', 117.60, 'ひのっ子', 'https://www.town.shiga-hino.lg.jp/'),
  ('滋賀県', '竜王町', 12000, '2024-01-01', 44.55, 'ドラゴンちゃん', 'https://www.town.ryuoh.shiga.jp/'),
  ('滋賀県', '愛荘町', 21000, '2024-01-01', 37.97, 'あしょまろくん', 'https://www.town.aisho.shiga.jp/'),
  ('滋賀県', '豊郷町', 7300, '2024-01-01', 7.80, 'とよさとタン', 'https://www.town.toyosato.shiga.jp/'),
  ('滋賀県', '甲良町', 6600, '2024-01-01', 13.63, 'せんとくん', 'https://www.kouratown.jp/'),
  ('滋賀県', '多賀町', 7200, '2024-01-01', 135.77, 'たがゆいちゃん', 'https://www.town.taga.lg.jp/')
ON CONFLICT (prefecture, city) DO UPDATE SET
  population = EXCLUDED.population,
  population_updated_at = EXCLUDED.population_updated_at,
  area_km2 = EXCLUDED.area_km2,
  mascot_name = EXCLUDED.mascot_name,
  official_url = EXCLUDED.official_url;

-- 福井県の一部（敦賀市など）
INSERT INTO municipalities (prefecture, city, population, population_updated_at, area_km2, mascot_name) VALUES
  ('福井県', '敦賀市', 64000, '2024-01-01', 251.39, 'ツヌガくん'),
  ('福井県', '福井市', 260000, '2024-01-01', 536.41, 'あさぴー'),
  ('福井県', '小浜市', 28000, '2024-01-01', 233.09, 'さばトラななちゃん')
ON CONFLICT (prefecture, city) DO UPDATE SET
  population = EXCLUDED.population,
  population_updated_at = EXCLUDED.population_updated_at;

COMMENT ON TABLE municipalities IS '自治体マスターテーブル - 人口・面積等の統計情報';
COMMENT ON COLUMN municipalities.population IS '最新人口（推計値含む）';
COMMENT ON COLUMN municipalities.mascot_name IS '自治体のゆるキャラ・マスコット名';
