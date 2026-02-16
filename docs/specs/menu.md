# メニュー・画像保存仕様書 (Menu Specs)

## 概要
店舗のメニュー情報の登録、画像のアップロード、およびマップ上での表示ロジックについて定義する。

## データ構造

### テーブル: `menu_items`

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | uuid | PK |
| `shop_id` | uuid | **店舗ID (`shops.id`)** が格納される。外部キー制約あり。 |
| `name` | text | メニュー名 |
| `price` | integer | 価格 |
| `description` | text | 説明文 |
| `image_url` | text | 画像の公開URL |
| `category` | text | カテゴリ (例: 'lunch', 'dinner' 等) |
| `sort_order` | integer | 表示順序 |
| `created_at` | timestamptz | 作成日時 |

### ストレージ
*   **バケット名**: `menu-images`
*   **ファイルパス構成**: (実装依存だが、通常はランダムIDまたは `shop_id/filename` 等)
*   **アクセス権**: Public Read。UploadはAuthenticated User (Owner) のみ。

## 画像保存フロー (`upsertMenuItem` / `uploadMenuImageAction`)
1.  **画像アップロード**:
    *   クライアント側で画像を圧縮。
    *   `uploadMenuImageAction` を通じて `menu-images` バケットにアップロード。
    *   Supabase Storage から公開URL (`publicUrl`) を取得して返却。
2.  **メニューデータ保存**:
    *   `upsertMenuItem` を呼び出し。
    *   `image_url` を含むメニュー情報を `menu_items` テーブルに Insert/Update。
    *   この際、`shop_id` は `shops.id` (店舗ID) が使用される。

## マップ表示ロジック (`app/taberu/page.tsx`)
マップ画面では、店舗情報とメニュー情報を結合して表示する。

1.  **データ取得**:
    *   `shops` テーブルから位置情報 (`lat`, `lng`) を含む店舗データを取得。
    *   Supabase の `select('*, menu_items_data:menu_items(*)')` クエリ（または類似のJoin）を使用して、関連するメニュー項目を一括取得。
2.  **表示**:
    *   マップ上のピンを選択すると、その店舗の `menu_items` がリスト表示される。
    *   **画像フォールバック**: `image_url` が null またはロードエラーの場合、代替UI (No Image等) を表示し、クラッシュを防ぐ。

## IDの整合性
*   メニューは「物理的な店舗」に紐づく情報であるため、`shops.id` に紐付けられる。
*   これは `payout_requests` や `shop_bank_details` が「個人 (Owner ID)」に紐づくのと対照的であるため注意が必要。
