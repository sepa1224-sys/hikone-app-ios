-- profiles テーブルに登録順（会員番号）カラムを追加
-- join_order: ユーザーが登録された順番を示す番号

-- カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS join_order SERIAL;

-- 既存ユーザーにjoin_orderを割り当て（created_at順）
-- 注意: 既にjoin_orderが設定されている場合はスキップ
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
BEGIN
  -- join_orderがNULLまたは0のレコードを、created_at順で更新
  FOR rec IN 
    SELECT id FROM profiles 
    WHERE join_order IS NULL OR join_order = 0
    ORDER BY created_at ASC
  LOOP
    UPDATE profiles SET join_order = counter WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- 新規ユーザー登録時に自動でjoin_orderを設定するトリガー
CREATE OR REPLACE FUNCTION set_join_order()
RETURNS TRIGGER AS $$
BEGIN
  -- join_orderが未設定の場合、現在の最大値+1を設定
  IF NEW.join_order IS NULL OR NEW.join_order = 0 THEN
    SELECT COALESCE(MAX(join_order), 0) + 1 INTO NEW.join_order FROM profiles;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーがあれば削除
DROP TRIGGER IF EXISTS trigger_set_join_order ON profiles;

-- 新規挿入時にトリガー発火
CREATE TRIGGER trigger_set_join_order
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_join_order();

-- インデックス（任意：join_orderでソートする場合に高速化）
CREATE INDEX IF NOT EXISTS idx_profiles_join_order ON profiles(join_order);

-- コメント
COMMENT ON COLUMN profiles.join_order IS '登録順（会員番号）- 自動採番';
