-- profilesテーブルのSELECTポリシーを修正
-- 以前のポリシーは "Users can view own profile" で、自分自身しか見れなかったため、
-- 統計情報（登録者数など）が取得できませんでした。
-- これを "Profiles are viewable by everyone" に変更します。

-- 1. 既存の制限的なSELECTポリシーを削除
drop policy if exists "Users can view own profile" on profiles;

-- 2. 重複防止のため、新しいポリシーも一旦削除（存在する場合）
drop policy if exists "Profiles are viewable by everyone" on profiles;

-- 3. 新しいSELECTポリシーを作成（誰でも閲覧可能）
-- これにより、.eq('city', '彦根市') などの集計クエリが正しく動作するようになります
create policy "Profiles are viewable by everyone" 
on profiles for select 
using (true);

-- 4. パフォーマンス向上のため、検索によく使われるカラムにインデックスを作成
create index if not exists idx_profiles_city on profiles (city);
create index if not exists idx_profiles_selected_area on profiles (selected_area);
