-- Ensure reviewer_comment column exists in mission_submissions table
ALTER TABLE public.mission_submissions
ADD COLUMN IF NOT EXISTS reviewer_comment TEXT;

-- Verify RLS policies allow update/insert if needed (already checked, but good to reaffirm)
-- Note: submitMission uses service_role key, so RLS is bypassed for that action.
-- However, if client-side inserts were used (which they are not supposed to be for this table), RLS would matter.
