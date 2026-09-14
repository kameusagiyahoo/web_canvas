# アーキテクチャ

## 基本方針

web_canvasは、GitHub Pagesで動くローカルファーストのNext.js/Reactアプリです。主要機能はbackendなしで動作し、Projectデータはブラウザへ保存します。

## Source of truth

### Screen

Screenの唯一のsource of truthは `Frame` です。NavigationやArchitecture用にScreenを重複保存しません。

### Canvas

Canvas上のUIは `Group` と `Item` で表現します。Partの追加・削除・複製・グループ・Layers変更は共通コマンドを通し、PCとスマホで同じモデルを使います。

### Navigation

画面遷移は次から導出します。

- `Item.action`
- `Item.actions`
- `Frame.swipe`

Navigation Graphはこれらから毎回導出される表示・編集層で、別のNavigationデータを保存しません。

### Architecture

Architectureは意味的な設計情報です。ScreenはFrameから導出し、Action/APIノードとlinkだけを追加メタデータとして保存します。Actionは任意で `sourceItemId` を持ち、Canvas上のPartと紐付けられます。

このbindingは設計メタデータであり、Navigationを置き換えません。

## Undo / Redo

Docを変更する操作は通常のHistoryを使います。表示だけの状態、たとえばzoom、検索、focus、diagnostics選択、relation trace、onboardingの開閉は永続化しません。

## 壊れた参照

missing target、missing Canvas source、duplicate bindingなどは勝手に補正しません。元データを保持し、diagnosticsとして利用者に示します。

## Project Library

ブラウザ内で複数Projectを管理します。Project切替前には現在のsnapshotを保存し、ProjectごとのDocとeditor stateを復元します。JSON import/exportは持ち運びと復旧の境界です。

## UI構成

PCは左右パネルとCanvas、スマホはBottom SheetとCanvasを中心に構成します。UIは異なっても、同じcommand・Doc・Project Libraryを使います。

## Cloud拡張

Cloudflare Worker、認証、DB、クラウド同期は、具体的な利用要件が発生した場合のみ追加します。現時点ではGitHub Pagesを標準デプロイ先とします。
