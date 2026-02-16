# セットアップ手順

## 1. 環境変数ファイルの作成

プロジェクトルートに `.env.local` という名前のファイルを作成し、以下の内容をコピー＆ペーストしてください：

```env
NEXT_PUBLIC_SUPABASE_URL=https://kawntunevmabyxqmhqnv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTI3ODYsImV4cCI6MjA4NDA2ODc4Nn0.OTwRa687dfxOpDs22NcS8BO2EXZYq-4pBIEh7_7RJow
```

**重要**: `.env.local` ファイルは `.gitignore` に含まれているため、Gitにはコミットされません。

## 2. 依存関係のインストール

```bash
npm install
```

## 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## トラブルシューティング

### Supabase接続エラーが発生する場合

1. `.env.local` ファイルが正しく作成されているか確認
2. 環境変数の値に余分なスペースや改行がないか確認
3. 開発サーバーを再起動（`.env.local` を変更した場合は再起動が必要）

### 画像が表示されない場合

1. Supabaseのストレージで画像が正しくアップロードされているか確認
2. 画像URLが正しい形式か確認（`https://` で始まる完全なURL）
3. ブラウザのコンソールでエラーを確認
