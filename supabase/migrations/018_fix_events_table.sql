-- eventsテーブルが存在しない場合は作成（既存の場合はスキップ）
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  prize_amount integer default 0,
  start_date timestamptz default now(),
  end_date timestamptz,
  location text,
  image_url text,
  created_at timestamptz default now()
);

-- statusカラムが存在しない場合は追加
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'events' and column_name = 'status') then
    alter table events add column status text default 'active';
  end if;
end $$;

-- submissions（イベント投稿）テーブルも存在確認・作成
create table if not exists event_submissions (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  image_url text not null,
  comment text,
  created_at timestamptz default now()
);

-- RLSポリシーの設定（events）
alter table events enable row level security;

-- 既存ポリシーがない場合のみ作成するためのDOブロック
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Events are viewable by everyone') then
    create policy "Events are viewable by everyone" on events for select using (true);
  end if;
end $$;

-- RLSポリシーの設定（event_submissions）
alter table event_submissions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'event_submissions' and policyname = 'Submissions are viewable by everyone') then
    create policy "Submissions are viewable by everyone" on event_submissions for select using (true);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'event_submissions' and policyname = 'Users can insert their own submissions') then
    create policy "Users can insert their own submissions" on event_submissions for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- ストレージバケット設定（event-photos）
-- 注意: storage.buckets への insert は権限が必要な場合があります。失敗した場合はダッシュボードから 'event-photos' バケットを作成してください。
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

-- ストレージポリシー
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Event photos are viewable by everyone') then
    create policy "Event photos are viewable by everyone"
      on storage.objects for select
      using ( bucket_id = 'event-photos' );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'Users can upload their own event photos') then
    create policy "Users can upload their own event photos"
      on storage.objects for insert
      with check ( bucket_id = 'event-photos' and auth.uid() = (storage.foldername(name))[1]::uuid );
  end if;
end $$;
