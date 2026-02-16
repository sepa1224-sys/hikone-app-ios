-- 1. Drop existing user_stamps table (data will be lost, assume dev environment)
DROP TABLE IF EXISTS user_stamps CASCADE;
DROP TABLE IF EXISTS stamp_logs CASCADE;

-- 2. Ensure stamp_cards (Master) exists and has correct columns
CREATE TABLE IF NOT EXISTS stamp_cards (
    shop_id UUID PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
    target_count INTEGER NOT NULL DEFAULT 10,
    reward_description TEXT,
    expiry_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for stamp_cards (Already added in previous migration but ensuring here for completeness/idempotency)
ALTER TABLE stamp_cards ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid error on recreate
DROP POLICY IF EXISTS "Owners can manage their own stamp cards" ON stamp_cards;
DROP POLICY IF EXISTS "Public can view stamp cards" ON stamp_cards;

CREATE POLICY "Owners can manage their own stamp cards"
ON stamp_cards FOR ALL
USING (auth.uid() = shop_id)
WITH CHECK (auth.uid() = shop_id);

CREATE POLICY "Public can view stamp cards"
ON stamp_cards FOR SELECT
USING (true);


-- 3. Create user_stamps (User State)
CREATE TABLE user_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stamp_card_id UUID NOT NULL REFERENCES stamp_cards(shop_id) ON DELETE CASCADE,
    current_count INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: One card per user per shop
    UNIQUE(user_id, stamp_card_id)
);

-- RLS for user_stamps
ALTER TABLE user_stamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cards"
ON user_stamps FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cards"
ON user_stamps FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only system/server action usually updates this, but allowing user to update (if we implement client-side logic) or restrict to service role.
-- For now, allow users to update their own cards (e.g. marking as completed? No, that should be logic).
-- Actually, stamp updates happen via Server Action which might use Service Role or User Role.
-- If User Role, we need UPDATE policy.
CREATE POLICY "Users can update their own cards"
ON user_stamps FOR UPDATE
USING (auth.uid() = user_id);


-- 4. Create stamp_logs (History)
CREATE TABLE stamp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_stamp_id UUID NOT NULL REFERENCES user_stamps(id) ON DELETE CASCADE,
    stamped_at TIMESTAMPTZ DEFAULT NOW(),
    location_lat FLOAT,
    location_lng FLOAT
);

-- RLS for stamp_logs
ALTER TABLE stamp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
ON stamp_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_stamps 
        WHERE user_stamps.id = stamp_logs.user_stamp_id 
        AND user_stamps.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert logs"
ON stamp_logs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_stamps 
        WHERE user_stamps.id = stamp_logs.user_stamp_id 
        AND user_stamps.user_id = auth.uid()
    )
);
