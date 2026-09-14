# Project Library

## 目的

1つのブラウザ内で複数の独立したweb_canvas Projectを扱うためのローカルProject管理層です。

## できること

- 新規作成
- 開く／切り替える
- 名前変更
- 複製
- 削除
- Save now
- JSON Export
- JSON Import

## 保存

Project Libraryはブラウザのlocal storageへ保存します。Project切替時は現在の編集内容を先にsnapshotし、直前の変更を落とさないようにします。

旧来の単一 `m3e:doc` が存在する場合はProject Libraryへ移行します。

## JSON Import

Project ManagerのOpen fileは、現在のProjectを直接置き換えず、新しい管理Projectとして読み込む経路です。意図的に現在のProjectを置換する操作は別経路として確認を要求します。

## 境界

現時点でaccount、backend、cloud syncはありません。別端末への移動はJSON export/importで行います。
