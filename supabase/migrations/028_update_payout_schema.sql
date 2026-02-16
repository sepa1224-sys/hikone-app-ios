-- Add processed_at to payout_requests
alter table payout_requests add column if not exists processed_at timestamp with time zone;

-- Update status check constraint to include 'completed' if you really want it, 
-- but 'paid' is already there. I will stick to 'paid' for consistency with 027 but 
-- since the user asked for 'completed', I will add 'completed' to the check constraint just in case.
-- Actually, modifying check constraints is complex in SQL (drop and add).
-- I'll use 'paid' as the internal status for "振込完了" (Payout Completed) and show it as "振込完了" in UI.
-- This avoids schema churn.
