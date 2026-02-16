-- Enable RLS for admin users on critical tables

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- shops table policies for admin
CREATE POLICY "Admins can do everything on shops"
ON shops
FOR ALL
USING (is_admin());

-- shop_bank_details table policies for admin
CREATE POLICY "Admins can do everything on shop_bank_details"
ON shop_bank_details
FOR ALL
USING (is_admin());

-- payout_requests table policies for admin
CREATE POLICY "Admins can do everything on payout_requests"
ON payout_requests
FOR ALL
USING (is_admin());

-- profiles table policies for admin (to view other users)
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
USING (is_admin());

-- user_stamps table policies for admin
CREATE POLICY "Admins can do everything on user_stamps"
ON user_stamps
FOR ALL
USING (is_admin());

-- stamp_cards table policies for admin
CREATE POLICY "Admins can do everything on stamp_cards"
ON stamp_cards
FOR ALL
USING (is_admin());
