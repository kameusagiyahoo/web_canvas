# アクセシビリティ手動検証

## 目的

自動E2Eでは確認できない、実際のscreen reader読み上げ順、focus、発見性、支援技術での操作性を確認します。

この文書はWCAG適合宣言ではありません。

## General-user beta前の最低マトリクス

1. iPhone Safari + VoiceOver
2. Desktop keyboard-only

追加候補:

- Android Chrome + TalkBack
- Windows + NVDA
- macOS + VoiceOver

## 記録する情報

- 実施日
- deploy commit SHA
- 端末／OS
- browser
- 支援技術とversion
- 使用言語
- 既存Projectの有無

## iPhone + VoiceOver

確認対象:

- Quick Start dialogのtitle、close、Back/Next/Start、focus return
- `?` からの再表示
- Screen / Add / Layers / Preview / Editの主要操作
- Screen追加・変更・削除
- Part追加・編集
- Navigation設定
- Preview
- Projects、JSON backup、Open file
- destructive operationの確認文言

読み上げ順が視覚順と大きく矛盾しないか、意味の分からないicon-only controlがないかを確認します。

## Desktop keyboard-only

- Add Screen
- toolbar
- Quick StartのTab/Shift+Tab trap、Escape、focus restore
- Project Managerのfocus containmentとEscape
- Navigation Graphの初期focus、Tab/Shift+Tab containment、Escape、open元へのfocus restore
- Architecture Flowの初期focus、Tab/Shift+Tab containment、Escape、open元へのfocus restore
- Previewの初期focus、Tab/Shift+Tab containment、Escape、open元へのfocus restore
- Preview内のAction付きPartをEnter/Spaceで実行し、画面遷移・戻る操作を確認
- 主要編集操作

## 自動E2Eとの境界

`e2e/accessibility-workflow.e2e.ts` では、主要dialogの初期focus、Tab/Shift+Tab containment、Escape、focus restoreをpreflightとして固定します。

さらにCIでは `e2e/mobile-practical-journey.e2e.ts` をChromiumに加えてPlaywright WebKit + iPhone mobile profileでも実行し、Screen追加、Part追加、Navigation編集、Preview、Project保存、reloadまでの主要スマホ操作がSafari系エンジンで破綻しないことをpreflightします。

WebKit E2EはSafari互換性の早期検出には使えますが、実iPhone Safariそのもの、VoiceOverの読み上げ順、Rotor、gesture、focus移動、発見性を検証するものではありません。そのため上記の手動マトリクスは引き続き必須です。

## 重大度

- **Blocker**: 主要フローを完了できない
- **High**: 大きな回避操作が必要、またはdata loss/destructive misunderstandingの恐れ
- **Medium**: 操作可能だが分かりにくい
- **Low**: 軽微な表現・快適性

Data lossや削除誤認は最低Highとします。

## 完了条件

最低マトリクスを実際のdeployed commitで実施し、Blockerを修正・再試験し、Highを修正または理由付きで受容・scope化した時点で完了とします。チェックリストを作っただけでは完了扱いにしません。
