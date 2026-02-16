# profiles テーブル設定ガイド

## 概要
Supabaseのマーケティング・分析用にユーザープロフィールデータを保存するテーブルです。

## セットアップ手順

### 1. Supabaseダッシュボードでの実行
1. Supabaseダッシュボードにログイン
2. 「SQL Editor」を開く
3. `supabase_profiles_table.sql` の内容をコピー＆ペースト
4. 「Run」ボタンをクリックして実行

### 2. テーブル構造

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | auth.usersのid（主キー） |
| full_name | TEXT | 姓名 |
| avatar_url | TEXT | プロフィール画像URL |
| gender | TEXT | 性別（男性/女性/その他/回答しない） |
| age_range | TEXT | 年代（10代/20代/30代/40代/50代/60代/70代以上） |
| residence | TEXT | 居住地（県内/県外/海外） |
| interests | TEXT[] | 興味関心（配列形式） |
| last_login | TIMESTAMP | 最終ログイン日時 |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

### 3. 自動トリガーの動作

- **新規ユーザー登録時**: `auth.users` にユーザーが追加されると、自動的に `profiles` テーブルにレコードが作成されます
- **Googleログイン時**: `raw_user_meta_data` から `full_name` と `avatar_url` を取得して自動設定されます

### 4. last_login の更新方法

ログイン時に `last_login` を更新するには、以下の関数を呼び出してください：

```sql
SELECT public.update_last_login();
```

または、アプリケーション側で以下のコードを実行：

```typescript
const { data, error } = await supabase.rpc('update_last_login')
```

### 5. 使用例

#### プロフィールの更新
```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    full_name: '山田 太郎',
    gender: '男性',
    age_range: '30代',
    residence: '県内',
    interests: ['グルメ', '歴史', 'ショッピング']
  })
  .eq('id', userId)
```

#### プロフィールの取得
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

#### マーケティング分析クエリ例
```sql
-- 年代別のユーザー数
SELECT age_range, COUNT(*) as count
FROM profiles
GROUP BY age_range
ORDER BY age_range;

-- 居住地別のユーザー数
SELECT residence, COUNT(*) as count
FROM profiles
GROUP BY residence;

-- 興味関心の分析
SELECT unnest(interests) as interest, COUNT(*) as count
FROM profiles
WHERE interests IS NOT NULL AND array_length(interests, 1) > 0
GROUP BY interest
ORDER BY count DESC;
```

### 6. セキュリティ

- RLS (Row Level Security) が有効化されています
- ユーザーは自分のプロフィールのみ閲覧・更新可能です
- 管理者は必要に応じて追加のポリシーを設定してください

### 7. 注意事項

- `interests` は配列形式です。Supabaseのクライアントでは `['グルメ', '歴史']` のように配列で保存できます
- `gender`, `age_range`, `residence` は CHECK制約で値が制限されています
- 既存ユーザーがいる場合は、コメントアウトされているマイグレーション用SQLを実行してください
