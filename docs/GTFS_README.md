# GTFSデータベース基盤

滋賀、京都、大阪、愛知、福井の広域GTFSデータを扱うためのデータベース基盤です。

## 📋 目次

1. [データベース設計](#データベース設計)
2. [インポート方法](#インポート方法)
3. [検索ロジック](#検索ロジック)
4. [使用方法](#使用方法)

## 🗄️ データベース設計

### テーブル構造

以下のテーブルが作成されます：

- **gtfs_stops**: 停留所情報（駅、バス停など）
- **gtfs_routes**: 路線情報
- **gtfs_trips**: 運行パターン情報（便）
- **gtfs_stop_times**: 停留所時刻情報
- **gtfs_calendar**: 運行カレンダー（平日/休日）

各テーブルには `feed_id` カラムがあり、複数のGTFSフィードを区別できます。

### マイグレーション実行

```bash
# SupabaseダッシュボードのSQL Editorで実行
# または、Supabase CLIを使用している場合
supabase migration up
```

マイグレーションファイル:
- `supabase/migrations/012_create_gtfs_tables.sql` - テーブル作成
- `supabase/migrations/013_create_gtfs_search_functions.sql` - 検索関数とSQLクエリ

## 📥 インポート方法

### 1. 環境変数の設定

`.env.local` ファイルに以下を追加：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. GTFSファイルの準備

各都道府県のGTFSファイルを以下のような構造で配置：

```
public/gtfs/
  ├── shiga/
  │   ├── stops.txt
  │   ├── routes.txt
  │   ├── trips.txt
  │   ├── stop_times.txt
  │   └── calendar.txt
  ├── kyoto/
  │   └── ...
  ├── osaka/
  │   └── ...
  ├── aichi/
  │   └── ...
  └── fukui/
      └── ...
```

### 3. インポートスクリプトの実行

```bash
# 依存関係のインストール
npm install

# 滋賀県のGTFSデータをインポート
npm run import-gtfs ./public/gtfs/shiga shiga

# 京都府のGTFSデータをインポート
npm run import-gtfs ./public/gtfs/kyoto kyoto

# 大阪府のGTFSデータをインポート
npm run import-gtfs ./public/gtfs/osaka osaka

# 愛知県のGTFSデータをインポート
npm run import-gtfs ./public/gtfs/aichi aichi

# 福井県のGTFSデータをインポート
npm run import-gtfs ./public/gtfs/fukui fukui
```

または、直接 `tsx` を使用：

```bash
npx tsx scripts/import-gtfs.ts <GTFSディレクトリパス> <feed_id>
```

### インポートスクリプトの動作

1. 指定したディレクトリからGTFSファイル（CSV）を読み込み
2. 既存データを削除（同じ `feed_id` のデータ）
3. データをバッチ処理（1000件ずつ）でSupabaseに挿入
4. 進捗を表示

## 🔍 検索ロジック

### TypeScript関数

`lib/gtfsSearch.ts` に以下の関数が用意されています：

#### 1. 最寄り駅検索

```typescript
import { findNearestStops } from '@/lib/gtfsSearch'

// 指定した座標から最寄りの停留所を検索
const stops = await findNearestStops(
  35.2700,  // 緯度
  136.2600, // 経度
  5,        // 検索半径（km）
  1         // 取得件数
)
```

#### 2. 直近の出発便検索

```typescript
import { findNextDepartures } from '@/lib/gtfsSearch'

// 指定した停留所から直近の出発便を検索
const departures = await findNextDepartures(
  'STOP001', // 停留所ID
  'shiga',   // フィードID
  10,        // 取得件数
  '08:00:00' // この時刻以降（オプション）
)
```

#### 3. 2点間の経路検索

```typescript
import { searchRoute } from '@/lib/gtfsSearch'

// 2つの座標から最寄り駅を特定し、出発駅から直近の出発便を検索
const result = await searchRoute(
  35.2700,  // 出発地点の緯度
  136.2600, // 出発地点の経度
  35.0100,  // 到着地点の緯度
  135.7700, // 到着地点の経度
  5,        // 最寄り駅検索の半径（km）
  10        // 取得する出発便の件数
)

if (result) {
  console.log('出発駅:', result.fromStop.stop_name)
  console.log('到着駅:', result.toStop.stop_name)
  console.log('出発便:', result.departures)
}
```

### SQLクエリ

詳細なSQLクエリは `supabase/migrations/013_create_gtfs_search_functions.sql` を参照してください。

#### 最寄り駅検索（SQL）

```sql
SELECT * FROM find_nearest_stops(
  35.2700,  -- 緯度
  136.2600, -- 経度
  5.0,      -- 検索半径（km）
  1         -- 取得件数
);
```

#### 直近の出発便検索（SQL）

```sql
SELECT 
  st.stop_id,
  s.stop_name,
  st.departure_time,
  t.trip_id,
  t.route_id,
  COALESCE(r.route_short_name, r.route_long_name) AS route_name,
  t.trip_headsign,
  t.direction_id,
  st.feed_id
FROM gtfs_stop_times st
INNER JOIN gtfs_stops s ON st.feed_id = s.feed_id AND st.stop_id = s.stop_id
INNER JOIN gtfs_trips t ON st.feed_id = t.feed_id AND st.trip_id = t.trip_id
INNER JOIN gtfs_routes r ON t.feed_id = r.feed_id AND t.route_id = r.route_id
WHERE 
  st.feed_id = 'shiga'
  AND st.stop_id = 'STOP001'
  AND st.departure_time >= CURRENT_TIME
ORDER BY st.departure_time ASC
LIMIT 10;
```

#### 2点間の経路検索（SQL）

詳細は `supabase/migrations/013_create_gtfs_search_functions.sql` のセクション3を参照してください。

## 📝 使用方法

### 例: アプリケーションでの使用

```typescript
// app/api/route-search/route.ts
import { searchRoute } from '@/lib/gtfsSearch'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fromLat = parseFloat(searchParams.get('fromLat') || '0')
  const fromLon = parseFloat(searchParams.get('fromLon') || '0')
  const toLat = parseFloat(searchParams.get('toLat') || '0')
  const toLon = parseFloat(searchParams.get('toLon') || '0')
  
  const result = await searchRoute(fromLat, fromLon, toLat, toLon)
  
  if (!result) {
    return NextResponse.json({ error: '経路が見つかりませんでした' }, { status: 404 })
  }
  
  return NextResponse.json(result)
}
```

## 🔧 トラブルシューティング

### インポートエラー

- **外部キー制約エラー**: テーブルのインポート順序を確認（stops → routes → trips → stop_times）
- **時刻形式エラー**: GTFSの時刻形式（"HH:MM:SS"）を確認
- **日付形式エラー**: calendar.txtの日付形式（"YYYYMMDD"）を確認

### 検索が遅い場合

- インデックスが正しく作成されているか確認
- `EXPLAIN ANALYZE` でクエリプランを確認
- 検索半径を小さくする

### 最寄り駅が見つからない場合

- 検索半径を大きくする（デフォルト: 5km）
- GTFSデータが正しくインポートされているか確認
- 座標が正しいか確認（緯度: -90〜90、経度: -180〜180）

## 📚 参考資料

- [GTFS仕様書](https://gtfs.org/schedule/reference/)
- [Supabase公式ドキュメント](https://supabase.com/docs)
- [PostgreSQL earthdistance拡張](https://www.postgresql.org/docs/current/earthdistance.html)
