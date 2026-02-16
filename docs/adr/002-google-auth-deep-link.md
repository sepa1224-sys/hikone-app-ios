# Googleログインのディープリンク対応（Firebase/Capacitor）

## 背景
- iOSでGoogleログインを開始すると外部ブラウザへ遷移し、アプリに戻れない事象が発生
- WebベースのOAuthリダイレクトではWebView・外部ブラウザ間の往復が必要で、ユーザー体験が低下

## 決定
- Firebase Authenticationのネイティブ実装（@capacitor-firebase/authentication）を採用
- iOSにカスタムURLスキーム（REVERSED_CLIENT_ID）を登録し、外部ブラウザからアプリへ確実に復帰
- ネイティブ環境ではGoogle Sign-In→IDトークン取得→Supabase signInWithIdTokenでアプリ内完結
- Web環境では従来のSupabase OAuthフローを継続

## 理由
- ネイティブSDKはApp内で完結し、WebViewの制約を受けない
- REVERSED_CLIENT_IDをURLスキームに設定することで、ブラウザ→アプリの戻り先を正しく解決
- SupabaseはGoogleのIDトークンによるサインインをサポートし、既存のユーザーデータと整合

## 実装
- 依存追加: @capacitor-firebase/authentication, firebase
- iOS設定: Info.plistにCFBundleURLTypesで「com.googleusercontent.apps.REVERSED_CLIENT_ID」を登録
- AppDelegate: openURLでFirebaseAuth/GoogleSignInのハンドリングを追加
- 設定: capacitor.config.tsのplugins.FirebaseAuthentication.providersに"google.com"を指定
- UI: app/login/page.tsxでネイティブ時はFirebaseAuthentication、Web時はSupabase OAuthを使用

## 前提条件
- GoogleService-Info.plistをXcodeプロジェクトに配置
- Firebase Consoleの認証でGoogleを有効化
- REVERSED_CLIENT_IDがInfo.plistのURLスキームと一致

## 影響範囲
- iOSビルドにFirebase/GoogleSignIn依存が追加
- 認証周りの戻り処理がAppDelegateで一元化

## ロールバック戦略
- capacitor.config.tsのprovidersから"google.com"を外し、従来のSupabase OAuthのみへ戻す

## 追加洞察（2026-02-15）
- Firebase導入以前から、ディープリンク受け入れの基盤で不具合が存在
- 原因は認証ではなく、Capacitor と iOS ネイティブ間の URL 委譲・復帰の不整合
- 対応として AppDelegate の openURL/Universal Links 委譲の再点検、capcitor.config.ts の server.url を排除し、Webサーバ依存の遷移を抑制
- アプリ起動時の appUrlOpen リスナーを安全化し、無効なURL入力時は早期リターン
