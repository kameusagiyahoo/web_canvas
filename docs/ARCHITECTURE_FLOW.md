# App Architecture Flow

## 目的

Navigationとは別に、アプリの意味的な処理を `Screen → Action → API → optional Screen` として設計・可視化します。

## ノード

- **Screen**: 既存Frameから導出。重複保存しない。
- **Action**: ユーザー操作やアプリ内処理を表す。
- **API**: HTTP method、path、名称を持つ設計ノード。

将来のAgent / Database等は、具体的なProjectで必要になってから追加します。

## Canvas binding

Actionは任意で `sourceItemId` を持てます。これはCanvas上のどのPartがそのActionの入口かを示す設計メタデータです。

同じPartに複数Actionが紐付いた場合はduplicate conflictとして明示し、勝手に所有者を推測しません。修復は通常のexclusive binding操作で行います。

## Quick Flow

Quick Flowは一般的な `Screen → Action → API → optional Screen` を一度に作ります。Canvas sourceの指定は任意です。作成全体を1回のUndoで戻せることを維持します。

## Navigationとの境界

Architecture linkはPreview画面遷移を直接駆動しません。Previewは既存のNavigationモデルを使います。ArchitectureとNavigationは異なる関心事です。

## View-only state

検索、zoom、focus、relation trace、diagnostics選択は保存しません。グラフの表示状態をDoc source of truthへ混ぜません。

## Canvasへの移動

ArchitectureからCanvas sourceを開く場合は、通常のCanvas選択とInspector経路を再利用します。専用の永続trace状態は作りません。
