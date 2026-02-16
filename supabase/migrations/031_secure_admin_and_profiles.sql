-- Add is_admin column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Function to check profile updates
CREATE OR REPLACE FUNCTION check_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent user from changing is_admin
  -- auth.role() check ensures only Service Role (admin scripts) can bypass this.
  -- Note: auth.role() returns 'authenticated' for normal users.
  IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) AND (auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'You cannot change your own admin status.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS on_profile_update_check ON profiles;
CREATE TRIGGER on_profile_update_check
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_profile_updates();

-- Set admin for specific email (optional, for development convenience)
-- You can change this email to your test account
UPDATE profiles 
SET is_admin = TRUE 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@example.com'
);
