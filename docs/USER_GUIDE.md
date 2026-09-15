# web_canvas 操作手順書

## 1. 目的

web_canvasは、画面UIを組み立て、画面遷移を設定し、Previewで確認し、最後にAIコーディング用Promptへ変換するための設計ツールです。

公開版: https://kameusagiyahoo.github.io/web_canvas/

## 2. 最初に覚える流れ

基本操作は次の順です。

1. Screenを作る
2. Partを置く
3. PartのActionで移動先Screenを指定する
4. Previewで動作確認する
5. Projectを保存する
6. 必要ならPromptを生成する
7. JSONを書き出してバックアップする

## 3. PCでの操作

### Screenを追加する

上部ツールバーのScreen追加操作から新しいScreenを作成します。Screenを選択するとInspectorで名前やサイズなどを編集できます。

### Partを追加する

左のPartsパネルからButton、Card、Text field、NavigationなどをCanvasへ配置します。選択したPartは右のInspectorで編集します。

### Partを移動・編集する

Canvas上でPartを選択してドラッグします。Inspectorでは文字、アイコン、スタイル、サイズ、状態、Actionなどを変更できます。

### Layers

Layersパネルでは前後関係とグループ内順序を確認・変更できます。

### Navigation

PartのAction、Navigation部品の各slot、またはScreenのswipeに移動先を設定します。Navigation Graphを開くと、Screen間の経路を俯瞰できます。

### Preview

Previewを開くと、実際にPartを押したりswipeしたりして画面遷移を確認できます。戻る操作は設定された遷移を逆方向に再生します。

### Architecture

Architectureでは、Screenとは別に意味的なActionやAPIを設計できます。Canvas上のPartをActionのsourceとして任意に紐付けられます。Architectureは設計メタデータであり、PreviewのNavigationを直接置き換えません。

### Prompt

右側のPromptタブを開き、アプリ名・概要・実装ターゲットを設定します。ターゲットは Platform neutral / Android / iOS / Web / PySide です。生成文は手編集でき、Copy Promptでコピーできます。

## 4. スマホでの操作

スマホでも同じProjectモデルを編集します。PCとは配置が異なり、主にBottom Sheetを使います。

### Screen

下部のScreenボタンからScreen一覧を開きます。追加、選択、名前変更、複製、削除、Preview、Navigation Graph、Architecture、Projectsへ移動できます。

### Part追加

下部の `+` からPartを選び、現在のScreenへ追加します。

### Part編集

Partを選択し、Editから文字・アイコン・スタイル・Action等を変更します。複製・削除もここから行えます。

### Layers

下部のLayersから、現在のScreenのPart順序を確認・変更できます。

### Preview

上部の ▶ Preview ボタンから現在の設計をすぐ確認できます。Screen一覧から特定のScreenを選んでPreviewを開始することもできます。

### Theme

上部のpaletteボタンから、light/dark、contrast、palette、shape、typography、motionを変更できます。

### Prompt

上部のPromptボタンからBottom Sheetを開き、アプリ名・概要・実装ターゲット・Prompt本文をPCと同じ内容で編集できます。ターゲット変更時は生成Promptへ即時反映され、本文を手編集した場合はリセット操作で自動生成文へ戻せます。Copy Promptで現在のPromptをコピーできます。

## 5. Project管理

Projectsでは次を行えます。

- 新規Project
- Projectを開く
- 名前変更
- 複製
- 削除
- Save now
- JSON Export
- JSON Open / Import

Projectは端末・ブラウザ内に保存されます。別端末へ自動同期はしません。

## 6. バックアップ

重要なProjectはProject JSONを書き出してください。復旧時はOpen file / Importを使用します。ブラウザの保存領域を消すとローカルProjectを失う可能性があります。

## 7. Undo / Redo

Canvas上の通常編集、Navigation、Architectureなどの永続変更は基本的に共通のUndo / Redo履歴に入ります。Projectそのものの削除はDoc内Undoの対象ではありません。

## 8. スマホとPCを行き来する

現在はクラウド同期を行わないため、別端末へProjectを移す場合はJSON Export → Open fileを使います。同一端末・同一ブラウザでは自動保存されたProjectを再度開けます。

## 9. 困ったとき

- 初回ガイド: `?` ボタンからQuick Startを再表示
- 画面遷移がおかしい: Navigation Graphで経路を確認
- Architectureの紐付けがおかしい: diagnosticsとCanvas bindingを確認
- 保存が不安: Project JSONを書き出す
- 表示が古い: GitHub Pagesの最新版を再読み込み

詳細は [バックアップと復旧](BACKUP_RECOVERY.md)、[Navigation Graph](NAVIGATION_GRAPH.md)、[Architecture Flow](ARCHITECTURE_FLOW.md) を参照してください。
