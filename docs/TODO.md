# TODO

## 優先度A — 一般利用前に確認すること

- [ ] 非開発者3〜5人で操作手順なしのユーザビリティセッションを実施
- [ ] iPhone Safari + VoiceOverを実施
- [ ] Desktop keyboard-onlyを実施
- [ ] Blocker / High findingsを修正・再試験
- [ ] onboardingの文言を実利用結果から調整
- [ ] backup/recoveryの理解度を実利用結果から確認

## 優先度B — スマホ／PC機能差

- [ ] スマホでもPrompt本文・実装ターゲットをPC同等に編集できるようにする
- [ ] スマホからAI設定／AI補助機能へ無理なく到達できる導線を検討
- [ ] スマホで大規模Navigation/Architectureを扱う際の検索・focus操作を評価
- [ ] タッチによる細かい配置調整の改善を、実利用で必要性確認後に実装

## 優先度C — 現Architectureの拡張条件

- [ ] Agent nodeは具体的Projectで必要になるまで追加しない
- [ ] Database nodeは具体的Projectで必要になるまで追加しない
- [ ] pinned/manual graph layoutは実Projectの規模で必要になるまで追加しない
- [ ] NavigationとArchitectureのsource of truthを統合しない

## 優先度D — セキュリティ／Cloud

- [ ] 公開・不特定利用でAI APIキーを扱う前にbrowser-stored key方針を再検討
- [ ] managed/public AI callが必要になった場合のみCloudflare Worker等へ移す
- [ ] cross-device/account同期が必要になった場合のみcloud syncを追加
- [ ] concreteな要件なしにbackend/auth/DBを追加しない

## 維持する不変条件

- Screen = Frame
- Navigation = `Item.action` / `Item.actions` / `Frame.swipe` から導出
- Architecture bindingはNavigationの代替ではない
- broken refは保持してdiagnostics表示
- duplicate binding conflictは推測修復しない
- Action複製時にCanvas binding/linkを暗黙複製しない
- Quick Flowは1 Undo step
- view-only stateは永続化しない
- GitHub Pagesで主要機能を維持
- LICENSE / NOTICE / attributionを維持
