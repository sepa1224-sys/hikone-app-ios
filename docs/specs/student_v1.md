# 学生向け専用ポータルUI (Student V1) 仕様書

## 1. 概要
学生ユーザーの帰属意識とアプリのアクティブ率を高めるため、所属（大学・高校）ごとに最適化されたポータル画面を提供する。

## 2. ターゲットユーザー
- 滋賀県内の大学・高校に在籍する学生ユーザー
- `profiles` テーブルで `is_student = true` かつ `school_id` が設定されているユーザー

## 3. 機能要件

### A. 所属コミュニティ・ヘッダー
- **表示内容**:
  - 学校名 (例: 滋賀大学)
  - 学校ロゴ (アイコン)
  - 参加学生数統計 ("現在、[学校名]から [人数]名 の学生が参加中！")
- **データソース**:
  - `schools` テーブル: 学校名
  - `profiles` テーブル: `school_id` に基づくカウント

### B. ランキング・セクション
- **機能**:
  - トップ3のユーザーを強調表示（金・銀・銅アイコン）
  - 「ランキング！」ボタンによる詳細表示（モーダルまたは別ページ）
  - 初回リリースは「ランニング（月間走行距離）」
- **表示項目**:
  - 順位
  - ユーザー情報 (ニックネーム, アイコン)
  - 記録 (km)
- **集計ロジック**:
  - `activity_logs` テーブルを集計 (SUM(distance))
  - 同一 `school_id` 内でのフィルタリング
  - 期間: 月次 (monthly) を想定
  - **実装**: Server Actions (`getSchoolRanking`) と Service Role を使用して RLS をバイパスし、学校内の全ユーザーを集計。

### C. 学年別分布グラフ (新規追加)
- **機能**:
  - 学校内の学年分布（1年生〜4年生など）を円グラフで表示
  - データがない場合は参加を促すメッセージを表示
- **UI**:
  - Recharts を使用した円グラフ (PieChart)
- **データソース**:
  - `profiles` テーブルの `grade` カラムを集計

### D. 学校別限定クーポン・セクション
- **機能**:
  - 所属学校の学生限定で利用可能なクーポンを表示
- **UI**:
  - カード形式
  - 「[学校名]生限定」ラベルの強調
  - チケット風のデザイン
- **データソース**:
  - (将来拡張) `coupons` テーブル + `target_school_id`
  - 現段階ではハードコードまたはモックデータでUIを構築

## 4. データモデル (Schema)

### schools (学校マスター)
| Column | Type | Description |
|---|---|---|
| id | UUID | PK |
| name | TEXT | 学校名 |
| type | TEXT | university / high_school |

### profiles (拡張)
| Column | Type | Description |
|---|---|---|
| is_student | BOOLEAN | 学生フラグ |
| school_id | UUID | FK -> schools.id |
| grade | INTEGER | 学年 |

### activity_logs (活動履歴)
| Column | Type | Description |
|---|---|---|
| user_id | UUID | FK -> profiles.id |
| activity_type | TEXT | 'run', 'walk' |
| distance | NUMERIC | 距離 (km) |
| created_at | TIMESTAMP | 日時 |

## 5. UI/UX デザイン
- **テーマカラー**: スクールカラーまたは若々しい配色（青・オレンジ基調）
- **インタラクション**: ランキングボタンはメインアクションとして目立たせる
