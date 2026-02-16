-- =========================================
-- 招待コード特典付与用 RPC 関数
-- =========================================

CREATE OR REPLACE FUNCTION apply_referral_bonus(
  invitee_id UUID,
  referral_code_to_use VARCHAR,
  bonus_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- 関数の所有者権限で実行（RLSをバイパス）
AS $$
DECLARE
  referrer_profile RECORD;
  invitee_profile RECORD;
  now_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
  now_timestamp := NOW();

  -- 1. 招待された人（自分）の情報を取得し、ロックする
  SELECT * INTO invitee_profile
  FROM profiles
  WHERE id = invitee_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'ユーザー情報が見つかりません');
  END IF;

  -- 2. 既に招待コードを使用済みかチェック
  IF invitee_profile.has_used_referral = TRUE THEN
    RETURN json_build_object('success', FALSE, 'message', '既に招待コードを使用済みです');
  END IF;

  -- 3. 招待した人の情報を取得し、ロックする
  SELECT * INTO referrer_profile
  FROM profiles
  WHERE referral_code = UPPER(TRIM(referral_code_to_use))
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', '無効な招待コードです');
  END IF;

  -- 4. 自分自身のコードを入力していないかチェック
  IF referrer_profile.id = invitee_id THEN
    RETURN json_build_object('success', FALSE, 'message', '自分の招待コードは使用できません');
  END IF;

  -- 5. 招待した人のポイントを更新
  UPDATE profiles
  SET points = COALESCE(points, 0) + bonus_amount,
      updated_at = now_timestamp
  WHERE id = referrer_profile.id;

  -- 6. 招待された人のポイントとフラグを更新
  UPDATE profiles
  SET points = COALESCE(points, 0) + bonus_amount,
      has_used_referral = TRUE,
      referred_by = referrer_profile.id,
      updated_at = now_timestamp
  WHERE id = invitee_id;

  -- 7. 招待した人の履歴を記録
  INSERT INTO point_history (user_id, amount, type, description, created_at)
  VALUES (
    referrer_profile.id,
    bonus_amount,
    'referral',
    COALESCE(invitee_profile.full_name, 'ユーザー') || 'さんを招待',
    now_timestamp
  );

  -- 8. 招待された人の履歴を記録
  INSERT INTO point_history (user_id, amount, type, description, created_at)
  VALUES (
    invitee_id,
    bonus_amount,
    'referral',
    '招待コード特典（' || COALESCE(referrer_profile.full_name, 'ユーザー') || 'さんから）',
    now_timestamp
  );

  RETURN json_build_object('success', TRUE, 'message', '招待特典を受け取りました！');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', FALSE, 'message', '処理中にエラーが発生しました: ' || SQLERRM);
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION apply_referral_bonus(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_referral_bonus(UUID, VARCHAR, INTEGER) TO service_role;
