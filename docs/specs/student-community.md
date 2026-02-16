# 学生コミュニティ機能 仕様書 (Student Community Features)

## 概要
学生ユーザー（大学生・高校生）が自身の所属する学校コミュニティに参加し、学校ごとの活動状況やランキングを確認できる機能。

## 1. ユーザー属性の管理
### DBスキーマ変更
- **profiles テーブル**
  - `is_student` (boolean): 学生フラグ
  - `school_id` (uuid): 学校ID (FK: schools.id)
  - `grade` (integer): 学年 (1〜4: 大学, 1〜3: 高校, etc.)

- **schools テーブル** (新規)
  - `id` (uuid)
  - `name` (text): 学校名
  - `type` (text): 'university' | 'high_school'

## 2. 画面遷移と機能
### ホーム画面 (UI)
- ユーザープロフィールに「所属学校ラベル」を表示（例: "滋賀大学 1年"）。
- ラベルは `next/link` でラップされ、タップすることで詳細ページへ遷移する。
- **遷移先URL**: `/school/[school_id]`
  - パラメータ: `school_id` (profiles.school_id から取得)
- **UIコンポーネント**:
  - ホバー時に背景色が変化し、右側に `ChevronRight` アイコンが表示されることで、タップ可能であることを示唆する。

### 学校詳細ページ (`/school/[id]`)
以下の情報を表示する。

1.  **学校基本情報**
    - 学校名
    - 学校内総参加人数 (profiles count where school_id = [id])

2.  **学年別人数分布**
    - 学年ごとのユーザー数をグラフまたはリスト表示。
    - クエリイメージ:
      ```sql
      SELECT grade, COUNT(*) 
      FROM profiles 
      WHERE school_id = [id] 
      GROUP BY grade 
      ORDER BY grade ASC;
      ```

3.  **校内月間走行距離ランキング**
    - 今月の走行距離（activity_logs.distance）を集計し、学校内でランキング表示。
    - 上位10名を表示（ニックネーム、学年、合計距離）。
    - 集計ロジック:
      - 対象期間: 今月初日〜現在
      - 対象アクティビティ: `run`, `walk`
      - クエリイメージ:
        ```sql
        SELECT 
          p.full_name,
          p.grade,
          SUM(a.distance) as total_distance
        FROM activity_logs a
        JOIN profiles p ON a.user_id = p.id
        WHERE 
          p.school_id = [id]
          AND a.created_at >= date_trunc('month', now())
        GROUP BY p.id
        ORDER BY total_distance DESC
        LIMIT 10;
        ```

## 3. データ集計とパフォーマンス
- ランキング集計はリアルタイム性を重視しつつ、負荷軽減のため `Materialized View` または `Edge Functions` でのキャッシュを検討する（詳細はADR参照）。
- プライバシー保護のため、ランキング表示にはニックネームを使用し、本名は表示しない設定を推奨。
