-- shopsテーブルにupdated_atカラムを追加
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 更新日時自動更新用の関数定義（存在しない場合のみ作成されるように OR REPLACE を使用）
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（既存のトリガーがあれば削除して再作成）
DROP TRIGGER IF EXISTS on_shops_updated ON shops;

CREATE TRIGGER on_shops_updated
  BEFORE UPDATE ON shops
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();
