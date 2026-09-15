# web_canvas

Material 3 Expressive の画面をブラウザ上で設計し、画面遷移・アーキテクチャ・実装プロンプトまで一つのProjectとして管理する、ローカルファーストのUI設計ツールです。

公開版: https://kameusagiyahoo.github.io/web_canvas/

## 主な機能

- スマホ画面／デスクトップ画面の作成と編集
- Material 3 Expressive 部品の配置・編集
- 複数Screen、Layers、Group、Undo / Redo
- 部品・スワイプによる画面遷移
- Previewで実際の操作フローを確認
- Navigation Graphで画面遷移を可視化・編集
- Architectureで Screen / Action / API の意味的な流れを設計
- Projectのローカル保存、複製、名前変更、JSON書き出し／読み込み
- 実装用Promptの生成
- 実装ターゲットを Platform neutral / Android / iOS / Web / PySide から選択
- 日本語・英語・中国語・韓国語のUI

## スマホとPC

スマホ版とPC版は別アプリではなく、同じDoc／Projectモデルを使います。スマホではBottom Sheet中心、PCでは左右パネル中心のUIになります。

スマホでも、Screen管理、Part追加・編集、Layers、Navigation、Preview、Project管理、Navigation Graph、Architectureまで利用できます。細かいドラッグ配置や大きなグラフの俯瞰はPCの方が効率的です。

詳細な使い方は [操作手順書](docs/USER_GUIDE.md) を参照してください。

## 実装Promptのターゲット

Promptパネルでは以下を選択できます。

- **Platform neutral**: OSやUIフレームワークを固定しない
- **Android**: Kotlin + Jetpack Compose
- **iOS**: Swift + SwiftUI
- **Web**: ブラウザ向けWebアプリ
- **PySide**: Python 3 + PySide6 + Qt Quick/QML

未指定時は Platform neutral です。画面サイズだけからAndroidを自動決定しません。

## 保存方針

Projectはブラウザ内にローカル保存されます。サーバーやアカウントは必須ではありません。別端末へ移す場合やバックアップにはProject JSONを使います。

重要なProjectは定期的にJSONを書き出してください。詳細は [バックアップと復旧](docs/BACKUP_RECOVERY.md) を参照してください。

## 開発

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run test:e2e
npm run build
```

GitHub Pages向け静的ビルドでは `NEXT_PUBLIC_BASE_PATH=/web_canvas` を設定します。`.github/workflows/deploy.yml` が `main` へのpush時に自動デプロイします。

## ドキュメント

- [操作手順書](docs/USER_GUIDE.md)
- [アーキテクチャ](docs/ARCHITECTURE.md)
- [アプリアーキテクチャフロー](docs/ARCHITECTURE_FLOW.md)
- [ナビゲーショングラフ](docs/NAVIGATION_GRAPH.md)
- [Project Library](docs/PROJECT_LIBRARY.md)
- [バックアップと復旧](docs/BACKUP_RECOVERY.md)
- [ロードマップ](docs/ROADMAP.md)
- [TODO](docs/TODO.md)
- [リリース準備状況](docs/RELEASE_READINESS.md)
- [ユーザビリティ検証](docs/USABILITY_VALIDATION.md)
- [アクセシビリティ検証](docs/ACCESSIBILITY_VALIDATION.md)

## ライセンスと由来

このリポジトリは `lnkiai/m3e-canvas` をGitHub Importで複製し、独立して開発している派生Projectです。MIT LicenseおよびNOTICEの帰属表示を維持します。詳細は [元Projectについて](docs/ORIGINAL_PROJECT.md) を参照してください。

`LICENSE` と `NOTICE` は法的・帰属上の原文を維持するため翻訳していません。
