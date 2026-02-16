# 銀行口座設定仕様書 (Bank Settings Specs)

## 概要
売上の振込先となる銀行口座情報の管理仕様。

## データ構造

### テーブル: `shop_bank_details`

| カラム名 | 型 | 説明 |
| :--- | :--- | :--- |
| `shop_id` | uuid | **PK / FK**: `auth.users.id` (Owner ID) が格納される。 |
| `bank_name` | text | 銀行名 |
| `branch_name` | text | 支店名 |
| `account_type` | text | 口座種別 ('ordinary' | 'current') |
| `account_number` | text | 口座番号 |
| `account_holder` | text | 口座名義 (カナ) |
| `updated_at` | timestamptz | 更新日時 |

## 保存・取得ロジック

### 一意性の担保
*   **1ユーザー1口座**: `shop_id` (Owner ID) を主キーとしているため、1人のユーザーにつき1つの口座情報のみが存在する。
*   **Upsert処理**: 保存時 (`updateShopBankInfo`) は `onConflict: 'shop_id'` を指定して Upsert を行い、重複登録を防ぐ。

### 取得フロー (`getShopSettings` / `getShopDetails`)
1.  ユーザーの `owner_id` (User ID) をキーとして `shop_bank_details` を検索。
2.  データが存在する場合はフォームの初期値として設定。
3.  データが存在しない場合は空欄として表示（**テストデータやハードコードされた初期値は使用しない**）。

## セキュリティ
*   **RLS (Row Level Security)**: ユーザーは自身のID (`auth.uid()`) と一致する `shop_id` のレコードのみ参照・更新可能。
*   **Service Role**: 一部のサーバーアクション (`updateShopBankInfo` 等) では、管理者による代理編集やシステム整合性のため Service Role Key を使用して RLS をバイパスする場合があるが、基本的には所有者のみがアクセスする。

## 注意点
*   テーブル名が `shop_bank_details` であるが、実質的には `user_bank_details` として機能している。これは「店舗オーナーとしての属性」であることを示しているが、IDは `users.id` であることに注意。
