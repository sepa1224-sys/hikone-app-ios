-- 店舗取引履歴テーブル
create table if not exists shop_transactions (
  id uuid default gen_random_uuid() primary key,
  shop_id uuid references auth.users(id) not null,
  customer_id uuid references profiles(id) not null,
  amount integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLSポリシー
alter table shop_transactions enable row level security;

-- 店舗（ログインユーザー）は自分の取引履歴を追加・参照できる
create policy "Enable insert for authenticated users" on shop_transactions
  for insert with check (auth.uid() = shop_id);

create policy "Enable select for own shop transactions" on shop_transactions
  for select using (auth.uid() = shop_id);
