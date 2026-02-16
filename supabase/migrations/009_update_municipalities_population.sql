-- 自治体人口データの更新（最新値に修正）
-- 固定値ではなくDBから取得するため、正確な人口データを保持

-- 彦根市の人口を最新値に更新（2024年推計）
UPDATE municipalities 
SET 
  population = 110489,
  population_updated_at = '2024-12-01'
WHERE city = '彦根市';

-- 他の自治体も最新の人口データに更新
UPDATE municipalities SET population = 344900, population_updated_at = '2024-12-01' WHERE city = '大津市';
UPDATE municipalities SET population = 112500, population_updated_at = '2024-12-01' WHERE city = '長浜市';
UPDATE municipalities SET population = 148200, population_updated_at = '2024-12-01' WHERE city = '草津市';
UPDATE municipalities SET population = 80500, population_updated_at = '2024-12-01' WHERE city = '近江八幡市';
UPDATE municipalities SET population = 86200, population_updated_at = '2024-12-01' WHERE city = '守山市';
UPDATE municipalities SET population = 71800, population_updated_at = '2024-12-01' WHERE city = '栗東市';
UPDATE municipalities SET population = 86800, population_updated_at = '2024-12-01' WHERE city = '甲賀市';
UPDATE municipalities SET population = 51200, population_updated_at = '2024-12-01' WHERE city = '野洲市';
UPDATE municipalities SET population = 54800, population_updated_at = '2024-12-01' WHERE city = '湖南市';
UPDATE municipalities SET population = 111500, population_updated_at = '2024-12-01' WHERE city = '東近江市';
UPDATE municipalities SET population = 36200, population_updated_at = '2024-12-01' WHERE city = '米原市';
UPDATE municipalities SET population = 20500, population_updated_at = '2024-12-01' WHERE city = '日野町';
UPDATE municipalities SET population = 11800, population_updated_at = '2024-12-01' WHERE city = '竜王町';
UPDATE municipalities SET population = 20800, population_updated_at = '2024-12-01' WHERE city = '愛荘町';
UPDATE municipalities SET population = 7100, population_updated_at = '2024-12-01' WHERE city = '豊郷町';
UPDATE municipalities SET population = 6400, population_updated_at = '2024-12-01' WHERE city = '甲良町';
UPDATE municipalities SET population = 7000, population_updated_at = '2024-12-01' WHERE city = '多賀町';
UPDATE municipalities SET population = 63500, population_updated_at = '2024-12-01' WHERE city = '敦賀市';
UPDATE municipalities SET population = 258000, population_updated_at = '2024-12-01' WHERE city = '福井市';
UPDATE municipalities SET population = 27500, population_updated_at = '2024-12-01' WHERE city = '小浜市';

-- 高島市を追加（まだない場合）
INSERT INTO municipalities (prefecture, city, population, population_updated_at, area_km2, mascot_name) VALUES
  ('滋賀県', '高島市', 44500, '2024-12-01', 693.05, 'たかぴょん')
ON CONFLICT (prefecture, city) DO UPDATE SET
  population = EXCLUDED.population,
  population_updated_at = EXCLUDED.population_updated_at;

COMMENT ON COLUMN municipalities.population IS '最新人口（2024年12月時点の推計値）';
