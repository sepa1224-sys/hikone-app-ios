# 振込申請 (Payout) 仕様書

## 概要
店舗オーナーが売上ポイントを現金として引き出すための振込申請フローおよびデータ構造について定義する。

## データ構造

### テーブル: `payout_requests`

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | uuid | PK |
| `shop_id` | uuid | **重要**: 申請者の個人ID (`profiles.id` / Owner ID) が格納される。店舗ID (`shops.id`) ではない。 |
| `amount` | integer | 申請金額 |
| `status` | text | ステータス (`pending`, `approved`, `rejected`, `paid`) |
| `bank_info` | jsonb | 申請時点の銀行口座情報のスナップショット |
| `created_at` | timestamptz | 作成日時 |

## プロセスフロー

### 1. 申請条件チェック
申請を行うには以下の条件を満たす必要がある。
*   ログイン済みであること。
*   `shop_bank_details` に口座情報が登録されていること。
*   `profiles.transaction_password` (4桁の暗証番号) が設定されていること。
*   申請金額が「振込可能残高」の範囲内であること。

### 2. 残高計算ロジック (`getShopBalance`)
振込可能残高は以下の式で算出される。

```
振込可能残高 = 現在の保有ポイント - ロック中の申請金額
```

*   **現在の保有ポイント**: `profiles.points`
*   **ロック中の申請金額**: `payout_requests` テーブルの `status` が `pending` または `approved` である申請の合計金額。

### 3. 申請実行 (`requestPayout`)
1.  暗証番号 (`transaction_password`) を照合。
2.  `shop_bank_details` から現在の口座情報を取得。
3.  `payout_requests` にレコードを作成。
    *   `shop_id`: ユーザーID (Owner ID) を設定。
    *   `status`: `pending` (初期状態)。
    *   `bank_info`: 取得した口座情報をJSONとして保存 (履歴保全のため)。

## ステータス遷移
1.  **pending** (申請中): ユーザーが申請した直後の状態。残高計算においてロック対象となる。
2.  **approved** (承認済み): 管理者が内容を確認し、振込手続き待ちの状態。ロック対象。
3.  **paid** (振込完了): 実際に振込が行われた状態。
    *   この時点で `profiles.points` から該当金額が減算されるわけではない（減算タイミングは別途検討が必要だが、現状の計算式では `points` が減らない限りロックされ続けるため、運用上は `paid` になったタイミング等でポイント減算処理が必要、あるいは `approved` で減算するなど。現状のコード `processPayment` は支払い時の減算のみ）。
    *   *Note: 現状の実装では `requestPayout` 時にポイント減算は行われていない。残高計算 (`availableBalance`) でロック分を引いて表示している。*
4.  **rejected** (却下): 申請に不備があった場合。ロック対象から外れ、残高が戻る。

## 個人IDへの紐付け
本システムでは、振込先は「店舗」ではなく「店舗オーナー個人（または法人格としてのユーザー）」に紐づく設計となっているため、`payout_requests` の `shop_id` カラムには `auth.users.id` (Owner ID) が使用される。
