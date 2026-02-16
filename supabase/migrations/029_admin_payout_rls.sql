-- Admin RLS Policy for payout_requests
-- Replace 'sepa1224@gmail.com' with the actual admin email if different, but based on the code it is this one.

create policy "Admin can view all payout requests"
  on payout_requests
  for select
  using (
    (auth.jwt() ->> 'email') = 'sepa1224@gmail.com'
  );
