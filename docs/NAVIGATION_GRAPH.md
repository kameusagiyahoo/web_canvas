# Navigation Graph

## 目的

Screen間の遷移を視覚的に確認・編集するためのグラフです。

## データ源

ノードはFrame、edgeは `Item.action` / `Item.actions` / `Frame.swipe` から導出します。Navigation Graph自体を別データとして保存しません。

`BACK_TARGET` は通常の行き先Screenではなく、Previewのstack戻りとして扱います。

## できること

- Screenノードを選択してCanvasへ移動
- ScreenからPreview開始
- 既存routeの行き先・transition変更
- route削除
- Screen間をdragしてroute作成
- route作成時に未使用Item、未使用slot、未使用swipe、新規Buttonからtriggerを選択
- transition選択
- missing target、到達不能、incomingなし、parallel route等のdiagnostics
- 検索とfocus

## Undo / Redo

グラフ上の編集もCanvasと同じDoc commandを使い、通常のUndo / Redoに参加します。

## PCとスマホ

PCではツールバー、スマホではScreens sheetから同じNavigation Graphを開きます。表示は画面サイズへ適応しますが、データモデルは共通です。
