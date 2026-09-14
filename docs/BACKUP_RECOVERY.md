# バックアップと復旧

## 保存場所

Projectはブラウザ／端末ローカルに保存されます。GitHub Pages上のアプリを開いていても、ProjectそのものがGitHubへ保存されるわけではありません。

## 日常バックアップ

Project Managerの **Export file** でProject JSONを書き出してください。重要な節目では定期的に保存することを推奨します。

## 復旧

Project Managerの **Open file** からJSONを読み込みます。この経路は現在編集中のProjectを破壊せず、別の管理Projectとして追加します。

## autosave失敗時

保存領域不足等でautosaveに失敗した場合は、表示される **Save Project JSON** から最新のメモリ上Docを書き出してください。

## Undoできるもの／できないもの

ItemやScreenの削除は通常のUndoで戻せます。Project ManagerでProjectそのものを削除する操作はDocのUndo履歴外です。削除確認をよく確認してください。

## 注意

Safari/Chromeのサイトデータ削除、プライベートブラウズ終了、端末初期化等でローカル保存データを失う可能性があります。重要ProjectはJSONを端末外にも保管してください。
