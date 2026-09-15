# ロードマップ

## Phase 1 — 独立Projectの安定化

**状態: 完了**

GitHub Pages、JSON互換、Project format/version、recoverable persistence、CIを維持し、不要なbackendを追加しない基盤を確立しました。

## Phase 2 — スマホEditor拡張

**状態: core flow完了**

- 複数Screen管理
- Part追加・編集
- Layers
- Undo / Redo
- Navigation設定
- Preview
- Navigation Graph
- Project Manager

PC専用機能を残さず、同じDoc commandをスマホUIから利用できる方向で継続改善します。

## Phase 3 — 機能に基づくArchitecture整理

**状態: 主要境界を抽出済み**

`app/page.tsx` はUI/controller coordinatorとし、新しいdomain logicはshared helperへ置きます。Frame、Item、History、Persistence、Navigation、Canvas geometry等の主要処理は分離済みです。

## Phase 4 — Visual Navigation Overview

**状態: 現モデルでは完了**

Frame/Action/SwipeからNavigation Graphを導出し、route編集・作成・diagnostics・Undo/Redoを共通モデルで実装しました。

## Phase 5 — App Architecture Flow

**状態: 基盤実装済み**

ScreenはFrameから導出し、Action/API/linkを意味的な設計情報として扱います。Canvas binding、Quick Flow、diagnostics、graph編集を実装済みです。

## Phase 5.5 — Compare / Variant

**状態: 基盤実装済み**

既存Frameを複製せずに最大3画面を横並びで比較できるCompare viewを追加します。比較対象の選択はview-only stateで、Projectへ別の比較用Screenモデルを保存しません。

「バリアントを作成」は既存のFrame複製コマンドを使って実際のScreenを作成し、その後の編集・Navigation・Previewは通常のFrameとして扱います。PCはToolbar、スマホはScreensから同じCompare viewへ到達します。

次の拡張は、実利用で必要性が確認できた場合に限り、Frame IDを参照する比較セット名・レビューコメント等の軽量メタデータを検討します。

## Phase 6 — 一般ユーザー向け準備

**状態: 進行中**

実装済み:

- Quick Start
- modal focus管理
- desktop keyboard / mobile accessible controls E2E
- backup & recovery guidance
- usability validation protocol
- accessibility validation protocol
- 日本語操作手順書と日本語ドキュメント整備
- スマホでのPrompt本文・実装ターゲット編集
- スマホSettingsからのAI設定とPart BehaviorのAI補助

次:

- 実ユーザー3〜5人でユーザビリティ検証
- iPhone Safari + VoiceOver実試験
- desktop keyboard-only実試験
- Blocker/High修正と再試験
- 大規模Navigation/Architectureのスマホ操作評価

## Phase 7 — 任意のsecure/cloud拡張

具体的な要求が出た場合のみ検討します。

- Cloudflare Worker
- server-side AI secret管理
- cloud Project sync
- authentication
- collaboration
- database/API layer

GitHub Pages + local-firstを標準とします。
