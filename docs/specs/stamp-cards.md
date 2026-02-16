# スタンプカード機能仕様書 (Stamp Cards Spec)

## 1. 概要
店舗が独自に発行するデジタルスタンプカード機能。ユーザーは気に入った店舗のカードを「マイカード」に登録し、来店時にQRコードをスキャンすることでスタンプを集め、特典を獲得できる。

## 2. データ構造
既存のテーブル構成をベースに、以下の2テーブルで管理する。

### 2.1. stamp_card_templates (店舗用マスター)
※ 物理テーブル名: `stamp_cards`
店舗ごとのスタンプカード設定（特典条件など）を管理する。1店舗につき1レコード存在する。

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| `shop_id` | UUID (PK) | 店舗ID (`shops.id` へのFK)。1店舗1カードの原則。 |
| `target_count` | INTEGER | 特典獲得に必要なスタンプ数 (例: 10)。 |
| `reward_description` | TEXT | 特典の内容 (例: "コーヒー1杯無料")。 |
| `expiry_days` | INTEGER | スタンプの有効期限（日数）。NULLの場合は無期限。 |
| `created_at` | TIMESTAMPTZ | 作成日時。 |
| `updated_at` | TIMESTAMPTZ | 更新日時。 |

### 2.1.1 権限設定 (RLS)
- **Owners can manage their own stamp cards**
  - **対象**: 店舗オーナー (authenticated users)
  - **条件**: `auth.uid() = shop_id`
  - **操作**: SELECT, INSERT, UPDATE, DELETE
  - **備考**: `stamp_cards` の `shop_id` は `auth.users.id` (Owner ID) と一致する必要がある。これは `shops` テーブルの `owner_id` と同一であり、1店舗1オーナー1アカウントの原則に従う。

### 2.2. user_stamps (ユーザー所持スタンプカード/状態)
※ 物理テーブル名: `user_stamps`
ユーザーが所持しているスタンプカードの状態（現在何個たまっているか）を管理する。

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| `id` | UUID (PK) | 所持カードの一意ID。 |
| `user_id` | UUID | ユーザーID (`profiles.id` へのFK)。 |
| `stamp_card_id` | UUID | スタンプカードID (`stamp_cards.shop_id` へのFK)。 |
| `current_count` | INTEGER | 現在のスタンプ数。デフォルト 0。 |
| `is_completed` | BOOLEAN | 特典交換条件を満たし、かつ交換済みか（あるいは交換待ちか）を表すフラグ。 |
| `created_at` | TIMESTAMPTZ | 作成日時（利用開始日）。 |
| `updated_at` | TIMESTAMPTZ | 更新日時（最終スタンプ日）。 |

### 2.3. stamp_logs (スタンプ獲得履歴)
※ 物理テーブル名: `stamp_logs` (旧: user_stamps)
ユーザーがいつ、どこでスタンプを獲得したかの履歴ログ。不正検知や分析に使用する。

| カラム名 | 型 | 説明 |
| --- | --- | --- |
| `id` | UUID (PK) | ログID。 |
| `user_stamp_id` | UUID | 親となる所持カードID (`user_stamps.id` へのFK)。 |
| `stamped_at` | TIMESTAMPTZ | スタンプ押印日時。 |
| `location_lat` | FLOAT | 押印時の緯度（不正チェック用）。 |
| `location_lng` | FLOAT | 押印時の経度（不正チェック用）。 |

## 3. 画面遷移とフロー

### 3.1. スタンプカード一覧（マイカード & 新規登録）
- **画面**: `app/stamp/cards/page.tsx`
- **概要**: ユーザーのスタンプカード活動の拠点。所持カードの確認と、新規カードの検索・登録が可能。
- **エリア構成**:
    1. **マイカード（My Cards）**:
        - `user_stamps` に登録済みのカード一覧。
        - 現在のスタンプ数と目標数を表示。
        - タップで詳細画面 (`/stamp/card/[shopId]`) へ遷移。
        - **Data Fetch**: `getMyActiveStampCards`
    2. **新しいカードを探す（Discover）**:
        - まだ `user_stamps` に登録していない店舗のカード一覧。
        - 「利用開始」ボタンで登録処理を実行 (`registerStampCard`)。
        - 登録成功時、即座にマイカードエリアへ移動（`router.refresh()`）。
        - **Data Fetch**: `getAvailableStampCards` (stamp_cards NOT IN user_stamps)

### 3.2. カード詳細
- **画面**: `app/stamp/card/[shopId]/page.tsx`
- **機能**: 特定のカードの詳細情報、スタンプ履歴、特典情報の確認。


### 3.4. スタンプ付与（QRスキャン）
- **画面**: `app/shop/scan/page.tsx` (または `app/stamp/scan/page.tsx`)
- **フロー**:
    1. 店舗に掲示されたQRコードをユーザーがスキャン。
    2. GPSチェック (半径50m以内)。
    3. `user_stamps` の `current_count` をインクリメント (UPDATE)。
    4. `stamp_logs` に履歴を記録 (INSERT)。
    5. 24時間以内の重複チェック (DBトリガー/ロジックで `stamp_logs` を参照)。
    6. **完了後の表示 (Feedback)**:
       - 成功メッセージと共に、**対象店舗のスタンプカードを大きく表示**する。
       - スタンプが1つ増えた状態を視覚的に確認させる（アニメーション等）。
       - カードの下に「続けてスキャン（他の人など）」と「ホームに戻る」ボタンを配置。
       - これにより、「確実にスタンプが押されたこと」をユーザーが直感的に理解できるようにする。

### 3.5. スタンプ付与の制約 (Constraints)
- **位置情報制限**: 店舗の登録位置から半径50m以内であること。
- **管理者バイパス**: 管理者アカウント (`sepa1224@gmail.com`) は、開発・デバッグ（特に海外からの接続など）のため、位置情報の距離制限を無視してスタンプを付与できる。
