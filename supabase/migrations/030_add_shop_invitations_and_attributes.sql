-- shopsテーブルにowner_idを追加
ALTER TABLE shops ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);

-- shop_invitationsテーブルの作成
CREATE TABLE IF NOT EXISTS shop_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id), -- shopsテーブルのIDがUUIDであると仮定
  invitation_code TEXT NOT NULL UNIQUE,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- profilesテーブルに属性を追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type TEXT; -- '大学生/高校生' など
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university_name TEXT; -- 大学名

-- RLS for shop_invitations
ALTER TABLE shop_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view/create invitations
CREATE POLICY "Admins can view all invitations" ON shop_invitations
  FOR SELECT USING ((auth.jwt() ->> 'email') = 'admin@example.com' OR (auth.jwt() ->> 'role') = 'service_role'); -- Adjust admin check as needed

CREATE POLICY "Admins can insert invitations" ON shop_invitations
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'email') = 'admin@example.com' OR (auth.jwt() ->> 'role') = 'service_role');

-- Shops (owners) can view their own invitations? (Maybe not needed if they just claim it)
-- Users (who claim) need to read the invitation by code.
-- We might need a function or a policy that allows reading by code if not used.
-- Actually, for "claiming", the server action will likely use Service Role Key, so RLS might not be strictly needed for the claiming user if we use Admin Client.
-- But for safety:
CREATE POLICY "Anyone can read unused invitations by code" ON shop_invitations
  FOR SELECT USING (is_used = FALSE);

-- shops table RLS update (if needed)
-- "owner_idがログインユーザーのIDと一致する店舗データのみを取得・更新できるように"
-- This is handled in the application query, but RLS is better.
-- I won't touch existing shops policies yet to avoid breaking public views (kaimono/taberu pages).
-- Public read access should remain. Write access should be restricted to owner.

-- Policy for updating shops by owner
CREATE POLICY "Owners can update their own shop" ON shops
  FOR UPDATE USING (auth.uid() = owner_id);

-- Policy for profiles update (users updating their attributes)
-- Existing policies likely cover this (users can update own profile).
