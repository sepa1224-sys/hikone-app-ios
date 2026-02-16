-- 店舗オーナーが自身のスタンプカードを作成・更新できるようにする
ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their own stamp cards"
ON stamp_cards FOR ALL
USING (auth.uid() = shop_id)
WITH CHECK (auth.uid() = shop_id);
