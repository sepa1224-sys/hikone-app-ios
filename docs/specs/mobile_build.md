# モバイルアプリビルド手順 (Capacitor)

## 1. 概要
本プロジェクトは Capacitor を使用して iOS / Android アプリとしてビルドします。
Next.js の Static Export (`output: 'export'`) を利用し、静的ファイルを生成して Capacitor に読み込ませる構成です。

## 2. 前提条件
- Node.js (v18以上推奨)
- Xcode (iOSビルド用, macOSのみ)
- Android Studio (Androidビルド用)
- CocoaPods (iOS依存関係管理)
- **Apple ID (iOS実機デバッグ用、無料アカウントで可)**

## 3. セットアップ手順

### 3.1. 依存関係のインストール
```bash
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

### 3.2. Capacitorの初期化 (初回のみ)
```bash
npx cap init "Regional Portal" com.regionalportal.app --web-dir=out
```

### 3.3. Next.js 設定の確認
`next.config.js` に以下が設定されていることを確認します。
```javascript
const nextConfig = {
  output: 'export', // 静的エクスポートの有効化
  images: {
    unoptimized: true, // 画像最適化の無効化 (必須)
  },
  // ...
};
```

## 4. ビルドフロー

### 4.1. Webアプリのビルド
Next.js アプリをビルドし、`out` ディレクトリに静的ファイルを生成します。
```bash
npm run build
```
**注意**: 現在、Server Actions を使用している機能は `output: 'export'` と互換性がありません。
完全なネイティブアプリ化には、Server Actions をクライアントサイドの API コール（Route Handlers への fetch 等）にリファクタリングする必要があります。
現状では、ビルドが失敗する場合、一時的に `out` ディレクトリを手動作成するか、Server Actions を使用しないページのみをエクスポートする等の対応が必要です。

### 4.2. Capacitor への同期
ビルドした Web アセット (`out` ディレクトリ) をネイティブプロジェクトにコピーします。
```bash
npx cap sync
```

### 4.3. ネイティブIDEでのビルド・実行

#### iOS (macOSのみ) - 無料アカウントでの実機デバッグ手順
1. プロジェクトを開く:
   ```bash
   npx cap open ios
   ```
2. Xcode が開いたら、左側のナビゲーターで **App** (プロジェクトルート) を選択します。
3. **TARGETS** リストから **App** を選択します。
4. **Signing & Capabilities** タブを開きます。
5. **Team** のドロップダウンで **Add an Account...** を選択し、Apple ID でログインします。
6. ログイン後、**Team** から **[あなたの名前] (Personal Team)** を選択します。
7. **Bundle Identifier** を一意なものに変更します（重要）。
   - デフォルトの `com.regionalportal.app` は他で使用されている可能性があるため、エラーが出る場合は変更してください。
   - 例: `com.regionalportal.app.yourname` や `jp.co.yourname.regionalportal` など。
   - ※ `capacitor.config.ts` の `appId` も合わせて変更することを推奨しますが、デバッグのみであればXcode上での変更だけで動作します。
8. iPhone を USB ケーブルで Mac に接続します。
9. Xcode の上部にあるデバイス選択メニューから、接続した iPhone を選択します。
10. **Run** ボタン (再生マーク ▶) をクリックしてビルド・インストールを開始します。
11. **信頼設定 (初回のみ)**:
    - iPhone 上で「信頼されていないデベロッパ」という警告が出た場合：
    - **設定** > **一般** > **VPNとデバイス管理** (またはプロファイルとデバイス管理) を開きます。
    - "デベロッパAPP" 欄にある自分のApple IDを選択し、**「[Apple ID]を信頼」** をタップします。
12. 再度アプリアイコンをタップすると起動します。

#### Android
```bash
npx cap open android
```
Android Studio が開いたら、Gradle の同期を待ち、実機またはエミュレーターで実行します。
USBデバッグを有効にしたAndroid端末を接続し、Runボタンを押すだけでインストール可能です。

## 5. PWA / オフライン対応
- `next-pwa` を導入済み。ビルド時に `sw.js` (Service Worker) が生成されます。
- `manifest.json` は `public/manifest.json` に配置されています。
- オフライン起動を有効にするため、Service Worker がキャッシュを管理します。

## 6. トラブルシューティング
- **ビルドエラー**: Server Actions 関連のエラーが出る場合は、該当機能を API Route に置き換えてください。
- **画像が表示されない**: `next/image` は `unoptimized: true` が必要です。
- **真っ白な画面**: ルーティングの問題の可能性があります。Capacitor はハッシュルーターの使用を推奨する場合もありますが、Next.js App Router ではデフォルトで動作するはずです。ただし、Trailing Slash の設定が必要な場合があります。
- **Signing エラー**: Bundle ID が重複しているか、無料アカウントの制限 (7日間の有効期限、3台までのデバイス制限) に引っかかっている可能性があります。Bundle ID を変更して再試行してください。
