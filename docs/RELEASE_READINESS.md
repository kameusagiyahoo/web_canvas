# リリース準備状況

## 現在のレベル

**個人の日常利用候補（personal daily-use candidate）**

主要な編集・保存・復旧・スマホ操作の自動テストは整備されていますが、一般ユーザー向けbetaを名乗るための実ユーザー検証はまだ完了していません。

## 自動テスト済みの主な範囲

- Desktop practical journey
- Mobile golden path
- Persistence stress
- Recovery / malformed import / quota failure
- Destructive action recovery
- First-run onboarding
- Keyboard / modal accessibility workflow
- Backup & recovery guidance
- Prompt実装ターゲット分離

## 手動検証の証拠ゲート

次の文書は手順を定義したもので、実施済みの証拠ではありません。

- `USABILITY_VALIDATION.md`
- `USABILITY_SESSION_TEMPLATE.md`
- `ACCESSIBILITY_VALIDATION.md`

General-user betaへ進めるには、特定のdeploy commitに対して実セッションを行い、Blocker/Highの問題を修正・再試験するか、理由付きで受容する必要があります。

## 残作業

- 3〜5人の非開発者によるユーザビリティ検証
- iPhone Safari + VoiceOver
- Desktop keyboard-only
- 必要に応じてAndroid Chrome + TalkBack
- onboardingとbackup/recovery文言の実利用確認
- スマホ／PCの機能差をさらに縮小

## リリース判定

チェックリストが存在するだけでは検証完了としません。実施日、deploy SHA、環境、結果、問題、再試験結果を残して初めてrelease levelを更新します。
