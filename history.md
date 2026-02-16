# ハイブリッド統合履歴

## 2026-02-14 Web/iOS 両立のための統合
- 目的: Web版のMiddleware/APIと、iOS静的エクスポートの両立
- 変更:
  - next.config.js に環境変数 `NEXT_OUTPUT_EXPORT` による切替を導入
  - middleware.ts に export 時無害化の条件分岐を追加
  - AppDelegate.swift / capacitor.config.ts / next.config.js を .bak で保全
  - docs/specs/hybrid-config.md を追加して仕様を定義
- 意図:
  - Web起動時はSSRでSupabase認証を活かす
  - iOS配布用は静的エクスポートでCapacitorに取り込み、Middleware/APIは無効化
- 運用:
  - Web: `npm run build`
  - iOS静的: `NEXT_OUTPUT_EXPORT=1 npm run build && npx cap sync`

## 2026-02-14 インポートエラーの解消
- 事象: `Attempted import error: 'getMissions' is not exported from '@/lib/actions/missions'`
- 対応:
  - `lib/actions/missions.ts` に `Mission` 型、`getMissions(month)`、`getUserMissionStatus()` を定義
  - Supabaseの `monthly_missions` と `mission_submissions` を参照して整合性を確保
- 検証:
  - Webビルドおよび `NEXT_OUTPUT_EXPORT=1` での静的ビルドを実行し、エラー解消を確認

## 2026-02-14 Google認証（Firebase/Capacitor）対応
- 目的: iOSで外部ブラウザに遷移せず、認証をアプリ内で完結
- 変更:
  - 依存追加: `@capacitor-firebase/authentication`、`firebase`
  - iOS設定: `ios/App/App/Info.plist` に `CFBundleURLTypes` を追加（`com.googleusercontent.apps.REVERSED_CLIENT_ID`）
  - AppDelegate: `open url` で `FirebaseAuth` および `GoogleSignIn` のURLハンドリングを追加
  - 設定: `capacitor.config.ts` の `plugins.FirebaseAuthentication.providers` に `"google.com"` を指定
  - UI: `app/login/page.tsx` をネイティブ時はFirebase認証、Web時はSupabase OAuthへ分岐
- 検証:
  - iOSプロジェクトへ同期 `npx cap sync ios` 実行
  - Webは従来通りのOAuth動作を維持
