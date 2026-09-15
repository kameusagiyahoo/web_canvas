# web_canvas: AIエージェントから設計を作るための仕様（beta）

web_canvas（https://kameusagiyahoo.github.io/web_canvas/）は、Material 3 Expressiveの画面をブラウザで設計するEditorです。設計は1つのJSON documentとして表現されます。AIエージェントはこのdocumentを生成し、利用者はweb_canvasで開いて調整し、実装用Promptへ変換できます。

この形式はbetaです。新しいfieldが追加される可能性がありますが、既存fieldの意味は維持します。

## 成果物

原則として **share link** を返してください。コードを実行できない場合は、JSON documentをコードブロックで返してください。利用者は `.json` として保存し、Project Managerの **Open file** から開けます。

share linkを作る場合はJSONを `design.json` などへ保存し、次のいずれかを実行します。長いJSONをshell commandへ直接埋め込まないでください。

```js
// Node: node link.mjs design.json
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
const json = readFileSync(process.argv[2], "utf8");
console.log("https://kameusagiyahoo.github.io/web_canvas/#docz=" + deflateRawSync(json).toString("base64url"));
```

```python
# Python: python link.py design.json
import sys, zlib, base64
data = open(sys.argv[1], "rb").read()
c = zlib.compressobj(9, zlib.DEFLATED, -15)
raw = c.compress(data) + c.flush()
print("https://kameusagiyahoo.github.io/web_canvas/#docz=" + base64.urlsafe_b64encode(raw).decode().rstrip("="))
```

このguideを別のURLから取得した場合は、そのguideと同じsite rootをshare linkに使ってください。documentは概ね100 KB未満を目安にします。`image` Partは `src` にHTTPS画像URLを指定できますが、画像dataを埋め込まないでください。

## Documentの基本形

```jsonc
{
  "title": "レシピ",
  "brief": "レシピを保存・検索するアプリ。",
  "frame": "phone",
  "platform": "neutral",
  "paletteKey": "purple",
  "theme": {
    "dark": false,
    "bothModes": true,
    "contrast": "standard",
    "shape": "rounded",
    "font": "roboto",
    "emphasized": false,
    "motion": "expressive"
  },
  "frames": [],
  "groups": []
}
```

`platform` は `neutral | android | ios | web | pyside`。未指定時はPlatform neutralとして扱います。画面サイズだけからAndroidを決めません。

`theme` は任意です。

- `contrast`: `standard | medium | high`
- `shape`: `square | rounded | full`
- `font`: `roboto | robotoFlex | robotoSerif | system`
- `motion`: `standard | expressive`
- `bothModes: true`: light/darkの両方を実装対象にする
- `dark`: Canvasで現在表示するmode

## Screen (`frames`)

標準phone screenは **412 × 892**、desktop screenは **1280 × 800** です。desktopは `w` / `h` を持ちます。

```json
{ "id": "home", "name": "ホーム", "x": 0, "y": 0, "note": "保存したレシピを一覧表示する。" }
{ "id": "detail", "name": "詳細", "x": 492, "y": 0 }
{ "id": "settings", "name": "設定", "x": 984, "y": 0, "swipe": { "left": "home" } }
```

- `id`: document内で一意な文字列
- `name`: Promptへ出すScreen名
- `note`: Screenの目的（任意）
- `bg`: background role（任意）
- `swipe`: `left | right | up | down` 方向の移動先（任意）

Screenのsource of truthはFrameです。Navigation用に別Screen dataを作らないでください。

## Part (`groups` / `items`)

すべてのPartはGroupの中に置きます。1つのGroupが1 Partの場合もあれば、connected buttonやlist item runのように複数Itemをまとめる場合もあります。座標はCanvas座標なので、Screenの `x` / `y` offsetを含めます。後ろに書いたGroupほど前面に描画されます。

```json
{
  "id": "g1",
  "x": 0,
  "y": 0,
  "axis": "x",
  "items": [
    { "id": "bar", "kind": "topAppBar", "label": "レシピ", "icon": "menu", "icon2": "search", "variant": "filled" }
  ]
}
```

基本的に各Itemには `id`, `kind`, `label`, `icon`（なければ `null`）, `variant` を持たせます。特に理由がなければ `variant: "filled"` を使います。

連結できる代表的なfamily:

- `button` + `button`: `axis: "x"`
- `iconButton` + `iconButton`: `axis: "x"`
- `chip` + `chip`: `axis: "x"`
- `listItem` + `listItem`: `axis: "y"`

## 主なPart kind

| kind | 用途 | 主なfield |
|---|---|---|
| `topAppBar` | 上部App bar | `label`, `icon`, `icon2`, `actions` |
| `bottomNav` | Navigation bar | `tabs`, `selected`, `actions` |
| `navRail` | desktop navigation rail | `tabs`, `selected` |
| `tabs` | tab row | `tabs`, `selected` |
| `searchBar` | 検索欄 | `label`, `icon2` |
| `button` | Button | `label`, `icon`, `variant`, `action`, `toggle`, `size` |
| `iconButton` | Icon button | `icon`, `variant`, `action` |
| `fab` | FAB | `icon`, `size` |
| `extendedFab` | Extended FAB | `label`, `icon` |
| `splitButton` | Split button | `label`, `icon` |
| `fabMenu` | FAB menu | `tabs` |
| `toolbar` | Floating toolbar | `tabs`, `variant` |
| `chip` | Chip | `label`, `icon`, `checked` |
| `card` | Card | `label`, `supporting`, `src`, `action`, `size`, `size2` |
| `listItem` | List item | `label`, `supporting`, `icon`, `icon2`, `action` |
| `box` | Container / sheet | `size`, `size2`, `fill` |
| `dialog` | Dialog | `label`, `supporting`, `icon` |
| `snackbar` | Snackbar | `label`, `supporting` |
| `textField` | Text field | `label`, `supporting`, `icon`, `variant` |
| `switch` | Switch | `label`, `checked` |
| `checkbox` | Checkbox | `label`, `checked` |
| `radio` | Radio button | `label`, `checked` |
| `slider` | Slider | `value` |
| `text` | Text | `label`, `size`, `bold` |
| `image` | Image | `size`, `src` |
| `divider` | Divider | 追加field不要 |
| `badge` | Badge | `label` |
| `loadingIndicator` | M3E loading | `contained` |
| `linearProgress` | Linear progress | `value`, `wavy` |
| `circularProgress` | Circular progress | `value`, `wavy` |

## Navigation

通常のtap navigationはItemの `action`、navigation componentのslotは `actions`、Screen swipeはFrameの `swipe` を使います。

```json
{
  "action": {
    "to": "detail",
    "transition": "slide"
  }
}
```

`to` はFrame `id` または `back`。`transition` は `slide | slideLeft | slideUp | slideDown | fade | expand | none` です。

Navigation Graphはこれらから導出されるため、別のNavigation source of truthを作らないでください。

## Part共通の補助field

- `note`: ラベルだけでは分からない振る舞い。Promptへ反映されます。
- `action`: tap時の移動先
- `toggle`: ButtonのON状態の見た目
- `supporting`: 補足文
- `fill`: Material color role

IconはMaterial Symbols名（`home`, `search`, `add`, `favorite`, `settings`, `arrow_back`, `edit`, `delete`, `share` など）を使用します。

## 設計するときの原則

- 不要なIconやPartを空間埋めのために追加しない。
- 1 Screenに役割を詰め込みすぎない。
- 同種のrowが並ぶならCardの乱用よりList Item runを優先する。
- Main actionは明確にし、Navigationが行き止まりにならないようにする。
- labelは利用者の依頼言語に合わせ、Lorem ipsumを使わない。
- rough placementでよい。最終調整は利用者がCanvasのTidyやdragで行える。
- ArchitectureのAction/API metadataが必要な場合でも、Navigationと同じdataへ統合しない。

## 返答前チェック

- `id` がdocument内で重複していない。
- `action.to` が存在するFrame `id` または `back` になっている。
- 各Itemに必要な `id`, `kind`, `label`, `icon`, `variant` がある。
- Group座標にScreen offsetが含まれている。
- `platform` が必要なら `neutral | android | ios | web | pyside` のいずれかである。
- 最終返答はshare linkまたはJSON documentであり、説明文だけで終わっていない。
