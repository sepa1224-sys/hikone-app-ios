-- =========================================
-- ひこポ送金機能用 RPC 関数
-- =========================================
-- 
-- Supabase のダッシュボード > SQL Editor で実行してください
--

-- ---------------------------------------------
-- 1. transfer_hikopo 関数の作成
-- ---------------------------------------------
-- 
-- 引数:
--   sender_id: 送金者のユーザーID (UUID)
--   receiver_referral_code: 受取人の招待コード (VARCHAR)
--   amount: 送金額 (INTEGER)
-- 
-- 戻り値: 送金後の送金者の残高 (INTEGER)
--

CREATE OR REPLACE FUNCTION transfer_hikopo(
  sender_id UUID,
  receiver_referral_code VARCHAR,
  amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER  -- 関数の所有者権限で実行（RLSをバイパス）
AS $$
DECLARE
  sender_points INTEGER;
  receiver_id UUID;
  receiver_name VARCHAR;
  sender_name VARCHAR;
  new_sender_balance INTEGER;
BEGIN
  -- バリデーション: 送金額が正の数かチェック
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- 送金者の情報を取得（ロック）
  SELECT points, full_name INTO sender_points, sender_name
  FROM profiles
  WHERE id = sender_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sender not found';
  END IF;
  
  -- 残高チェック
  IF sender_points < amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- 受取人を招待コードで検索
  SELECT id, full_name INTO receiver_id, receiver_name
  FROM profiles
  WHERE referral_code = receiver_referral_code
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receiver not found';
  END IF;
  
  -- 自分自身への送金を禁止
  IF sender_id = receiver_id THEN
    RAISE EXCEPTION 'Cannot send to yourself';
  END IF;
  
  -- 送金者のポイントを減らす
  UPDATE profiles
  SET points = points - amount
  WHERE id = sender_id
  RETURNING points INTO new_sender_balance;
  
  -- 受取人のポイントを増やす
  UPDATE profiles
  SET points = points + amount
  WHERE id = receiver_id;
  
  -- 送金者の履歴を記録
  INSERT INTO point_history (user_id, amount, type, description, created_at)
  VALUES (
    sender_id,
    -amount,
    'use',
    COALESCE(receiver_name, 'ユーザー') || 'さんへ送金',
    NOW()
  );
  
  -- 受取人の履歴を記録
  INSERT INTO point_history (user_id, amount, type, description, created_at)
  VALUES (
    receiver_id,
    amount,
    'earn',
    COALESCE(sender_name, 'ユーザー') || 'さんから受取',
    NOW()
  );
  
  -- 送金後の残高を返す
  RETURN new_sender_balance;
  
EXCEPTION
  WHEN OTHERS THEN
    -- エラー時はロールバックして例外を再スロー
    RAISE;
END;
$$;

-- ---------------------------------------------
-- 2. 関数の実行権限を設定
-- ---------------------------------------------

-- 認証済みユーザーのみ実行可能
GRANT EXECUTE ON FUNCTION transfer_hikopo(UUID, VARCHAR, INTEGER) TO authenticated;

-- ---------------------------------------------
-- 確認用クエリ
-- ---------------------------------------------

-- 関数が作成されたか確認
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'transfer_hikopo';

-- テスト（実行前にIDとコードを適切な値に置き換えてください）
-- SELECT transfer_hikopo(
--   '送金者のUUID'::UUID,
--   '受取人の招待コード',
--   100
-- );
