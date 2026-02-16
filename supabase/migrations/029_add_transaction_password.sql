-- Add transaction_password to profiles
alter table profiles add column if not exists transaction_password text check (length(transaction_password) = 4);
