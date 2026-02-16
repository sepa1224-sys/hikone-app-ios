# ハイブリッド構成仕様（Web / iOS Capacitor 両立）

- 目的: Web版とiOSアプリ版のソースコードを単一リポジトリで共存させる
- 方針: 環境変数でビルドモードを切り替え、Middleware/APIはWebのみ有効化

## 切替戦略
- NEXT_OUTPUT_EXPORT=1 のとき: Next.js `output: 'export'`（静的エクスポート）
- それ以外: SSR（標準のサーバーサイド実行）

## 実装要点
- next.config.js
  - output: process.env.NEXT_OUTPUT_EXPORT === '1' ? 'export' : undefined
  - images.unoptimized: true
- middleware.ts
  - if (process.env.NEXT_OUTPUT_EXPORT === '1') return NextResponse.next()
  - Web起動時は Supabase SSR セッション更新を実施
- API（app/api/*）
  - Webでは通常稼働
  - Export時はAPIはビルド対象外（静的エクスポートでは使用しない前提）

## iOS設定
- capacitor.config.ts の server.url は 192.168.178.46 を維持
- キャパシタ同期: `NEXT_OUTPUT_EXPORT=1 npm run build && npx cap sync`

## 運用例
- Web開発: `npm run dev` / `npm run build`
- iOS配布用静的アセット: `NEXT_OUTPUT_EXPORT=1 npm run build`

## 留意事項
- Server Actions や動的サーバー機能は静的エクスポートと非互換
- ExportビルドではMiddleware/APIは機能しない（回避のため無害化）
