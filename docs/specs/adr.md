# ADR: Capacitor 6 から 5 へのダウングレード

決定:
Capacitor 6 系から 5 系へダウングレードし、依存を v5 に統一する。

背景 (Why):
- Capacitor 6 系では node_modules 内の Swift の型不整合（JSArray 等）が多発
- プラグイン内コードの改変が同期時に上書きされ、修正の持続が困難
- 連続ビルド失敗により開発/配布フローが阻害

対応 (How):
- 依存を v5 系へ統一（@capacitor/core, ios, cli, android、Firebase Authentication）
- npx cap sync ios を実行し iOS プロジェクトへ反映
- CocoaPods でネイティブ依存を解決（Podfile 追加）
- DerivedData と SwiftPM キャッシュを削除し、パッケージ解決を安定化

意図:
最新機能の利用よりも、App Store リリースに向けた「ビルドの安定性」を最優先する。
