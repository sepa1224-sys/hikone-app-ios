-- 店舗銀行口座情報
create table if not exists shop_bank_details (
  shop_id uuid references auth.users(id) primary key,
  bank_name text,
  branch_name text,
  account_type text check (account_type in ('ordinary', 'current')), -- 普通/当座
  account_number text,
  account_holder text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 振込申請履歴
create table if not exists payout_requests (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references auth.users(id) not null,
  amount integer not null check (amount > 0),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  bank_info jsonb not null, -- 申請時点の口座情報をスナップショット保存
  admin_note text, -- 管理者メモ
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS設定
alter table shop_bank_details enable row level security;
alter table payout_requests enable row level security;

-- shop_bank_details policies
create policy "Users can view own shop bank details" on shop_bank_details
  for select using (auth.uid() = shop_id);

create policy "Users can insert own shop bank details" on shop_bank_details
  for insert with check (auth.uid() = shop_id);

create policy "Users can update own shop bank details" on shop_bank_details
  for update using (auth.uid() = shop_id);

-- payout_requests policies
create policy "Users can view own payout requests" on payout_requests
  for select using (auth.uid() = shop_id);

create policy "Users can insert own payout requests" on payout_requests
  for insert with check (auth.uid() = shop_id);
