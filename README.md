# 彦根市ポータルサイト

Next.js (App Router) と Tailwind CSS を使用した彦根市ポータルサイトです。PWA対応で、モバイルファーストなデザインを採用しています。

## 機能

- ホームページ
- たべる（彦根の店舗情報 - Supabase連携）
  - **マップ表示**: Leafletを使用したインタラクティブな地図で店舗をピン表示
  - **現在地ボタン**: GPSで現在地を取得してマップに表示
  - **高度な絞り込み機能**:
    - ジャンル（カテゴリ）でフィルタリング
    - 現在営業中の店舗のみ表示
    - 臨時休業店舗の除外
  - **マップとリストの連動**: マップのピンをクリックするとリストの該当店舗が強調表示
- 買い物（店舗情報）
- ニュース（地域情報）
- 下部ナビゲーション
- PWA対応（オフライン対応、ホーム画面への追加可能）
- 臨時休業店舗の特別表示（白黒フィルター + CLOSED表示）

## セットアップ

### 1. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を記述してください：

```env
NEXT_PUBLIC_SUPABASE_URL=https://kawntunevmabyxqmhqnv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTI3ODYsImV4cCI6MjA4NDA2ODc4Nn0.OTwRa687dfxOpDs22NcS8BO2EXZYq-4pBIEh7_7RJow
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 4. ビルド

```bash
npm run build
npm start
```

## Supabaseデータベース構造

`shops` テーブルには以下のカラムが必要です：

- `id` (number) - 主キー
- `name` (string) - 店舗名
- `description` (string, optional) - 説明
- `image_url` (string, optional) - 画像URL
- `category` (string, optional) - カテゴリ（例: "ラーメン", "カフェ", "近江牛"）
- `status` (string, optional) - ステータス（`temp_closed` で臨時休業表示）
- `address` (string, optional) - 住所
- `phone` (string, optional) - 電話番号
- `latitude` (number, optional) - 緯度（地図表示に必要）
- `longitude` (number, optional) - 経度（地図表示に必要）
- `opening_hours` (jsonb or text, optional) - 営業時間
  - JSON形式: `{"monday": "09:00-22:00", "tuesday": "09:00-22:00", ...}`
  - または文字列形式
- `created_at` (timestamp, optional) - 作成日時
- `updated_at` (timestamp, optional) - 更新日時

### 営業時間の形式例

```json
{
  "monday": "09:00-22:00",
  "tuesday": "09:00-22:00",
  "wednesday": "09:00-22:00",
  "thursday": "09:00-22:00",
  "friday": "09:00-22:00",
  "saturday": "09:00-22:00",
  "sunday": "closed"
}
```

## PWAアイコンの設定

`public/icons/` ディレクトリに以下のサイズのアイコン画像を配置してください：

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

アイコンは [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) などのツールで生成できます。

## 技術スタック

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- Leaflet / React-Leaflet (地図表示)
- Lucide React (アイコン)
- next-pwa

## ディレクトリ構成

```
.
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # ホームページ
│   ├── taberu/             # たべるページ（Supabase連携）
│   ├── kaimono/            # 買い物ページ
│   ├── news/               # ニュースページ
│   └── globals.css         # グローバルスタイル
├── components/
│   ├── BottomNavigation.tsx # 下部ナビゲーション
│   ├── ShopMap.tsx         # マップコンポーネント
│   ├── ShopFilters.tsx     # フィルターコンポーネント
│   └── ShopList.tsx        # 店舗リストコンポーネント
├── lib/
│   └── supabase.ts         # Supabaseクライアント設定
├── public/
│   ├── icons/              # PWAアイコン
│   └── manifest.json       # PWAマニフェスト
├── .env.local              # 環境変数（要作成）
├── next.config.js          # Next.js設定（PWA含む）
├── tailwind.config.js      # Tailwind設定
└── package.json
```

## 主な機能

### たべるページ

- **Supabase連携**: `shops` テーブルから店舗データを取得
- **インタラクティブマップ**:
  - Leafletを使用した地図表示
  - 店舗をピンで表示（選択状態で色が変わる）
  - 現在地ボタンでGPS位置を取得
  - マップのピンをクリックするとリストの該当店舗が強調表示
- **高度な絞り込み機能**:
  - ジャンル（カテゴリ）タブでフィルタリング
  - 「現在営業中のみ表示」チェックボックス
  - 「臨時休業を除外」チェックボックス
  - フィルターリセットボタン
- **店舗リスト**:
  - カード形式で店舗を表示
  - 営業ステータス表示（営業中/営業時間外/臨時休業）
  - `status` が `temp_closed` の店舗は：
    - 画像に白黒フィルター（grayscale）を適用
    - 中央に大きく「CLOSED（臨時休業）」を表示
- **モバイルファーストデザイン**: スマホで操作しやすいUI
