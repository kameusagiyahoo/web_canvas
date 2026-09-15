# ユーザビリティ検証手順

## 目的

web_canvasを開発者の説明なしで渡したとき、初めて使う人が基本フローを発見・完了できるか確認します。

自動E2Eの代わりではなく、General-user beta判断のための実利用証拠です。

## 参加者

3〜5人を目安に、web_canvasを実装していない人を対象にします。デザイン経験者、技術に詳しくない人、一般利用者などを混ぜます。開発者本人は外部参加者に数えません。

これは形成的評価の実用サンプルであり、統計的代表性を主張しません。

## セットアップ

原則としてGitHub Pagesのdeployed buildを使用します。初回体験を見る場合はclean profileまたはprivate browsingを使います。

記録:

- 日付
- commit SHA
- desktop/mobile
- browser
- device/viewport
- 参加者の経験
- 既存stateの有無

不要な個人情報は記録しません。

## モデレーター規則

1. UIの操作名ではなく、達成したい目的を伝える。
2. 正解のcontrol名を先に教えない。
3. 可能ならthink aloudを依頼する。
4. 約2分blockしたら、先にblockageを記録して最小限のhintを出す。
5. 成功を推測せず観察事実を書く。
6. セッション中に製品を修正しない。

## Core task

1. 初回orientation
2. 2枚目のScreenを作る
3. controlを追加する
4. `Item.action` / NavigationでScreenを接続する
5. Previewで確認する
6. Projectを保存し再度見つける
7. Project JSONを書き出し、Open fileが復旧経路であることを確認する

## Outcome

各taskを次で記録します。

- Success
- Success with hint
- Partial
- Fail

## 集計観点

- discoverability
- terminology
- visual hierarchy
- navigation/flow
- Preview mental model
- persistence/backup model
- mobile ergonomics
- accessibility

複数参加者で同じ問題が繰り返された場合は優先して修正します。
