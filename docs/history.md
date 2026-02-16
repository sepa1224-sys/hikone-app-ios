
2026-02-15: ディープリンク基盤の再点検と安全化

概要:
Firebase導入以前から存在していた「アプリケーションを開けませんでした」事象を、認証ではなくCapacitorブリッジのURL委譲・復帰の問題として特定。基礎設計へ立ち返り、安全化を実施。

変更点:
- AppDelegate の openURL/Universal Links 委譲の点検（適切な Bool の返却維持）
- capacitor.config.ts の server.url を排除し、開発サーバ依存の遷移を停止
- AppUrlListener の appUrlOpen を安全化し、無効URL時は早期リターン

意図:
認証基盤ではなくルーティングの競合を解消し、ディープリンク復帰を安定化するため。

2026-02-15: Capacitor 6 から 5 へのダウングレードによる安定化

概要:
Capacitor 6 系で node_modules 配下の Swift ファイルに JSArray などの型不整合が多発し、継続的な修正が困難かつビルド不安定であったため、Capacitor 5 系へ統一して安定性を優先した。

変更点:
- 依存の統一: @capacitor/core, @capacitor/ios, @capacitor/cli, @capacitor/android を 5.x に統一
- プラグイン: @capacitor-firebase/authentication を 5.x に合わせて整合
- 同期: npx cap sync ios を実行し、iOS プロジェクトへ反映
- ネイティブ同期: Podfile を作成し CocoaPods ベースで依存解決
- キャッシュ掃除: DerivedData と SwiftPM キャッシュを削除してパッケージ解決の不具合を解消

意図:
最新機能よりも App Store へのリリースに向けた「ビルドの安定性」を最優先するため。

2026-02-14: 学生ページの静的UIから動的データ表示への移行

**概要**:
学生向けポータル画面 (`app/school/[id]/page.tsx`) において、プレースホルダー（準備中表示）だったランキングおよびグラフ部分を、実際のDBデータに基づく動的表示に切り替えた。
また、学校限定クーポンのUIを追加し、学生ユーザーへのインセンティブを強化した。

**変更点**:
- **ランキングの実装**:
    - `activity_logs` と `profiles` を結合・集計する Server Action (`getSchoolRanking`) を実装。
    - Service Role を使用して RLS をバイパスし、学校内の全ユーザーのランキング算出を実現。
    - UI: 上位3名を金・銀・銅の特別デザインで表示し、競争心を刺激する演出を追加。
- **学年別分布グラフの有効化**:
    - `profiles` の `grade` カラムを集計する Server Action (`getSchoolGradeDistribution`) を実装。
    - `recharts` ライブラリを導入し、円グラフ (PieChart) で視覚的に分布を表示。
    - データゼロ時の「最初の投稿者になりませんか？」というCTAメッセージを実装。
- **クーポンセクションの追加**:
    - チケット風デザインの「[学校名]生限定クーポン」セクションを追加（モックデータ運用）。

**技術的詳細**:
- **データ取得**: クライアントコンポーネントから Server Actions を呼び出すハイブリッドパターンを採用し、SEOとインタラクティビティを両立（ただしページ自体は `use client`）。
- **ライブラリ**: グラフ描画に `recharts` を採用。
