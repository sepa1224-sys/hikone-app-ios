-- profilesテーブルに都道府県（prefecture）、地方区分（region）、詳細エリア（detail_area）カラムを追加
-- 居住地のより詳細な設定を可能にする

-- 都道府県カラムの追加（既存の location カラムとの互換性のため）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS prefecture TEXT;

-- 地方区分カラムの追加（滋賀県: 湖東、湖南、湖北、湖西）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS region TEXT;

-- 詳細エリアカラムの追加（自由入力または選択）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS detail_area TEXT;

-- コメントを追加
COMMENT ON COLUMN profiles.prefecture IS '都道府県（location と同義、新規保存時に使用）';
COMMENT ON COLUMN profiles.region IS '地方区分（滋賀県: 湖東、湖南、湖北、湖西）';
COMMENT ON COLUMN profiles.detail_area IS '詳細エリア（自由入力または選択）';

-- 既存の location データを prefecture にコピー（prefecture が NULL の場合のみ）
UPDATE profiles
SET prefecture = location
WHERE prefecture IS NULL AND location IS NOT NULL;

-- 既存データの地方区分を自動設定（滋賀県のユーザーのみ）
UPDATE profiles
SET region = CASE
  WHEN city IN ('彦根市', '近江八幡市', '東近江市', '愛荘町', '豊郷町', '甲良町', '多賀町', '日野町', '竜王町') THEN '湖東'
  WHEN city IN ('大津市', '草津市', '守山市', '栗東市', '野洲市', '湖南市', '甲賀市') THEN '湖南'
  WHEN city IN ('長浜市', '米原市') THEN '湖北'
  WHEN city = '高島市' THEN '湖西'
  ELSE NULL
END
WHERE (prefecture = '滋賀県' OR location = '滋賀県') AND region IS NULL;

-- インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_profiles_prefecture ON profiles(prefecture);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_detail_area ON profiles(detail_area);
