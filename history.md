# 変更履歴

## 2026-02-16
- Google OAuth の戻り先を Web URL からアプリ専用スキームに固定
  - redirectTo を `com.googleusercontent.apps.121579951720-m58qnuucimva3pikish0r9rvdq581grl://oauth2redirect/google` にハードコード
  - 目的: Safari が Web に留まる問題を回避し、確実にアプリへ復帰させる
  - 対象: app/login/page.tsx の signInWithOAuth オプション
