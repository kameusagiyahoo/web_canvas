# コントリビューションガイド

web_canvasへの改善提案を歓迎します。

## 開発環境

Node.js 22系を推奨します。

```bash
npm install
npm run dev
```

変更前後に次を実行してください。

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## 基本方針

- GitHub Pagesで主要機能が動くローカルファースト構成を維持する。
- concreteな要件がない限り、backend、DB、認証、クラウド同期を追加しない。
- ScreenはFrameを唯一のsource of truthとする。
- Navigationは `Item.action` / `Item.actions` / `Frame.swipe` から導出する。
- Architectureは意味的なAction/APIと任意のCanvas bindingを扱い、Navigationの代替にしない。
- 永続データを変更する操作は通常のUndo / Redo履歴を通す。
- 壊れた参照は勝手に修復せず、診断として表示する。
- PC用とスマホ用で別のドメインモデルを作らない。

## UI変更

既存のMaterial 3 Expressiveのデザイン意図とアクセシビリティを崩さないでください。スマホとPCは同じProjectを扱うため、片方だけに機能を追加する場合は、もう一方の導線も検討してください。

## テスト

純粋なロジックはVitest、実際のユーザーフローはPlaywright E2Eで保護します。localStorageを初期化するE2Eでreloadも行う場合、`page.addInitScript` がreload時にも再実行される点に注意してください。必要ならsessionStorageで一度だけ初期化します。

## ドキュメント

利用者向け・開発者向けドキュメントは原則日本語で記述します。コード識別子、API名、ライブラリ名は原表記のままで構いません。

## ライセンス

MIT LicenseとNOTICEの帰属表示を維持してください。
