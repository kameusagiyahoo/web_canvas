import type { Lang } from "./i18n";
import type { Platform } from "./tokens";

export type PromptBasePlatform = "android" | "web";

export const PLATFORM_TARGETS: { key: Platform; label: string; icon: string }[] = [
  { key: "neutral", label: "Platform neutral", icon: "devices" },
  { key: "android", label: "Android", icon: "android" },
  { key: "ios", label: "iOS", icon: "phone_iphone" },
  { key: "web", label: "Web", icon: "language" },
  { key: "pyside", label: "PySide", icon: "desktop_windows" },
];

export const basePromptPlatform = (target: Platform): PromptBasePlatform =>
  target === "android" || target === "ios" ? "android" : "web";

const COPY: Record<Lang, {
  generalHeading: string;
  targetLabel: string;
  platform: Record<Exclude<Platform, "android" | "web">, string>;
  dynamicPrefix: string;
  dynamic: Record<Exclude<Platform, "android" | "web">, string>;
  motionStandard: Record<Exclude<Platform, "android" | "web">, string>;
  motionExpressive: Record<Exclude<Platform, "android" | "web">, string>;
  general: Record<Exclude<Platform, "android" | "web">, string[]>;
}> = {
  ja: {
    generalHeading: "## 全体の指針",
    targetLabel: "実装ターゲット",
    platform: {
      neutral: "実装先は Platform neutral です。特定の OS・UI フレームワーク・パッケージ形式には固定せず、設計意図と振る舞いを実装先に適した標準技術へ写像してください。",
      ios: "実装先は iOS（ネイティブアプリ）です。Swift + SwiftUI を使って実装してください。",
      pyside: "実装先はデスクトップアプリ（Python 3 + PySide6）です。UI は Qt Quick/QML + Qt Quick Controls 2 を基本にしてください。",
    },
    dynamicPrefix: "ダイナミックカラーを使います。",
    dynamic: {
      neutral: "ダイナミックカラーを使います。実装先がユーザーのアクセント色を安全に提供する場合はそれを種として利用し、利用できない場合は下記の色ロールをフォールバックにしてください。特定 OS の API は前提にしません。",
      ios: "ダイナミックカラーを使います。iOS の tint / accent を利用できる場合は設計のアクセントとして反映し、利用できない場合は下記の色ロールをフォールバックにしてください。Android の壁紙由来 Dynamic Color API は使いません。",
      pyside: "ダイナミックカラーを使います。ホスト OS / Qt からアクセント色を取得できる場合のみ設計の種として利用し、取得できない場合は下記の色ロールをフォールバックにしてください。Android 固有 API には依存しません。",
    },
    motionStandard: {
      neutral: "モーションは Material 3 standard motion の意図に合わせ、実装先の標準アニメーション API で弾まない滑らかな画面遷移・状態変化にしてください。MotionScheme API の存在は前提にしません。",
      ios: "モーションは Material 3 standard motion の意図を SwiftUI の標準 Animation / withAnimation に写像し、弾まない滑らかな画面遷移・状態変化にしてください。MotionScheme API は使いません。",
      pyside: "モーションは Material 3 standard motion の意図を QML の Behavior / NumberAnimation 等に写像し、弾まない滑らかな画面遷移・状態変化にしてください。MotionScheme API は使いません。",
    },
    motionExpressive: {
      neutral: "モーションは Material 3 expressive motion の意図に合わせ、実装先の標準アニメーション API で軽いスプリング感のある遷移・状態変化にしてください。MotionScheme API の存在は前提にしません。",
      ios: "モーションは Material 3 expressive motion の意図を SwiftUI の spring 系 Animation に写像し、過度にならない軽いスプリング感を付けてください。MotionScheme API は使いません。",
      pyside: "モーションは Material 3 expressive motion の意図を QML の easing / SpringAnimation 等に写像し、過度にならない軽いスプリング感を付けてください。MotionScheme API は使いません。",
    },
    general: {
      neutral: [
        "まず画面の目的からアプリのカテゴリを判断し、そのカテゴリで一般に期待される作成・一覧・詳細・編集・削除・検索・設定などの機能を、該当する範囲で一通り実装する。",
        "データは本物として扱い、実装先に適したローカル永続化手段で保存して再起動・再読み込み後も残す。ダミーデータは入れず、空状態、入力検証、失敗通知、削除確認を実装する。",
        "スケッチにない振る舞いは画面目的とラベルから補い、操作可能な要素を無反応のままにしない。",
        "OS やフレームワークを固定しない。実装先が決まったら、その環境の標準コンポーネント・ナビゲーション・アクセシビリティ機構を優先しつつ、Material 3 Expressive の色・形・余白・タイポグラフィの設計意図を保つ。",
        "色は上記カラースキームのロールを単一のテーマ層に集約し、各画面で色値を直接ハードコードしない。",
        "横一列と指定した部品は同じ行に保ち、重ね配置は記述どおりの前後関係を保つ。実装先で崩れる場合は操作可能性を優先してレスポンシブに調整する。",
        "入力・タップ・クリックには実装先で自然なフィードバックを付け、戻る操作は実装先の標準ナビゲーション規約と履歴に統合する。",
        "アイコンは意味を維持し、実装先に標準の同等アイコンがあればそれを使う。Material Symbols Rounded を使う場合は正規のアセットとして扱う。",
        "完成時は選択した実装環境で再現可能な production build 手順と、実行可能な成果物またはビルド可能なプロジェクトを提供する。",
      ],
      ios: [
        "画面の目的からアプリのカテゴリを判断し、スケッチにない場合でもそのカテゴリで通常必要な機能を実装する。",
        "SwiftUI をUIの基本とし、NavigationStack、sheet、alert、標準コントロール、アクセシビリティ API を優先する。Material 3 Expressive の値は中央の Theme / token 層へ写像し、Android API を移植しない。",
        "ユーザーデータは構造化データなら SwiftData、軽量設定なら AppStorage / UserDefaults など用途に合う永続化を使い、再起動後も保持する。ダミーデータは入れず、空状態、入力検証、削除確認、エラー表示を実装する。",
        "画面遷移は NavigationStack と iOS の標準インタラクティブ戻る操作を壊さず、設計された遷移の意図を SwiftUI のトランジションへ写像する。",
        "色は指定した Material 3 ロールを SwiftUI の中央テーマから参照し、View 内でカラー値を直書きしない。",
        "横一列指定は HStack 等で同じ行に保持し、重ね配置は ZStack 等で指定された前後関係を維持する。",
        "アイコンは意味が一致する SF Symbols を優先し、Material Symbols Rounded 固有の見た目が必要な場合のみ適切に同梱したアセットを使う。",
        "実装完了時は Xcode でビルド可能なプロジェクトと Release 構成を成果物にする。署名済み IPA は Apple Developer の証明書・Provisioning Profile が提供されない限り必須にしない。",
      ],
      pyside: [
        "画面の目的からアプリのカテゴリを判断し、スケッチにない場合でも作成・一覧・詳細・編集・削除・検索・設定など必要な機能を一通り実装する。",
        "Python 3 + PySide6 を使い、レスポンシブなUIとモーションは Qt Quick/QML + Qt Quick Controls 2 を基本とする。Material 3 Expressive のロール・形状・タイポグラフィ・余白は中央の Theme singleton / token 層で表現する。",
        "ユーザーが作成した構造化データは SQLite、軽量な設定は QSettings を基本に永続化し、アプリ再起動後も保持する。ダミーデータは入れず、空状態、入力検証、削除確認、エラー通知を実装する。",
        "412×892 は基準の論理ウィンドウサイズとして扱い、デスクトップでウィンドウを広げても破綻しないようアンカー／Layout を使って応答的に伸縮させる。",
        "横一列指定は QML RowLayout 等で同じ行に保持し、重ね配置は Item / Pane 等の同一コンテナ内で z-order を維持する。",
        "画面遷移は StackView 等で履歴を管理し、戻る操作・キーボード操作・ウィンドウ操作をデスクトップアプリとして自然に実装する。",
        "Material Symbols Rounded は必要なアセットを適切に同梱して利用し、意味のない代替文字には置き換えない。",
        "実装完了時は requirements / pyproject 等の依存定義、起動手順、テスト可能なソースを含め、PyInstaller 等で配布可能な実行成果物を生成できる構成にする。",
      ],
    },
  },
  en: {
    generalHeading: "## General guidance",
    targetLabel: "Implementation target",
    platform: {
      neutral: "The implementation target is platform-neutral. Do not lock the design to an OS, UI framework, or package format; map the design intent and behavior to the target environment's standard technologies.",
      ios: "Build it as a native iOS app using Swift and SwiftUI.",
      pyside: "Build it as a desktop app using Python 3 and PySide6, with Qt Quick/QML and Qt Quick Controls 2 as the primary UI stack.",
    },
    dynamicPrefix: "Use dynamic color:",
    dynamic: {
      neutral: "Use dynamic color when the eventual target safely exposes a user accent color; otherwise fall back to the color roles below. Do not assume an OS-specific dynamic-color API.",
      ios: "Use the iOS tint/accent when it is available and appropriate, and otherwise fall back to the color roles below. Do not use Android wallpaper-derived Dynamic Color APIs.",
      pyside: "Use a host OS / Qt accent color only when it can be obtained portably; otherwise fall back to the color roles below. Do not depend on Android-specific APIs.",
    },
    motionStandard: {
      neutral: "Match Material 3 standard motion with the target platform's native animation APIs: smooth, non-bouncy transitions and state changes. Do not assume a MotionScheme API exists.",
      ios: "Map Material 3 standard motion to SwiftUI Animation / withAnimation for smooth, non-bouncy transitions and state changes. Do not use a MotionScheme API.",
      pyside: "Map Material 3 standard motion to QML Behavior / NumberAnimation or equivalent for smooth, non-bouncy transitions and state changes. Do not use a MotionScheme API.",
    },
    motionExpressive: {
      neutral: "Match Material 3 expressive motion with the target platform's native animation APIs, using a restrained spring feel. Do not assume a MotionScheme API exists.",
      ios: "Map Material 3 expressive motion to a restrained SwiftUI spring animation. Do not use a MotionScheme API.",
      pyside: "Map Material 3 expressive motion to QML easing / SpringAnimation or equivalent with a restrained spring feel. Do not use a MotionScheme API.",
    },
    general: {
      neutral: [
        "Infer the product category from the screens and implement the normally expected create, list, detail, edit, delete, search, settings, and related flows where they apply.",
        "Treat user data as real and persist it with storage appropriate to the eventual target so it survives restart/reload. Do not seed dummy data; implement empty states, validation, failure reporting, and deletion confirmation.",
        "Complete unspecified behavior from screen intent and labels; no interactive element should be a no-op.",
        "Do not mandate an OS or framework. Once a target is chosen, prefer that environment's standard components, navigation, and accessibility mechanisms while preserving the Material 3 Expressive color, shape, spacing, and typography intent.",
        "Centralize all scheme roles in one theme layer and never hard-code UI colors in individual screens.",
        "Keep explicitly single-row parts on one row and preserve described overlap/z-order. Adapt responsively when required for a usable implementation.",
        "Use target-native interaction feedback and integrate Back with the target platform's navigation history and conventions.",
        "Preserve icon semantics; use a native equivalent when one exists, or treat Material Symbols Rounded as a proper asset when exact identity matters.",
        "Provide reproducible production-build instructions and either a runnable artifact or a buildable project appropriate to the selected environment.",
      ],
      ios: [
        "Infer the product category and implement normally expected functionality even where the sketch omits it.",
        "Use SwiftUI as the primary UI layer and prefer NavigationStack, sheets, alerts, standard controls, and iOS accessibility APIs. Map Material 3 Expressive values into a centralized Swift theme/token layer rather than porting Android APIs.",
        "Persist structured user data with SwiftData and lightweight preferences with AppStorage / UserDefaults as appropriate. Keep data across restarts and implement empty states, validation, deletion confirmation, and error presentation.",
        "Use NavigationStack and preserve the standard iOS interactive-back behavior while mapping the intended transitions to SwiftUI transitions.",
        "Reference the specified Material 3 roles through a centralized SwiftUI theme; do not hard-code color values inside Views.",
        "Keep single-row constraints in HStack or equivalent and preserve intentional overlap with ZStack or equivalent.",
        "Prefer semantically equivalent SF Symbols; bundle an appropriate Material Symbols Rounded asset only when its exact visual identity is required.",
        "Deliver an Xcode-buildable project with a Release configuration. A signed IPA is not required unless an Apple Developer signing identity and provisioning profile are supplied.",
      ],
      pyside: [
        "Infer the product category and implement the normally expected create, list, detail, edit, delete, search, settings, and related flows even where the sketch omits them.",
        "Use Python 3 + PySide6, with Qt Quick/QML + Qt Quick Controls 2 for responsive UI and motion. Express Material 3 Expressive roles, shapes, typography, and spacing through a centralized Theme singleton/token layer.",
        "Persist structured user data with SQLite and lightweight preferences with QSettings so they survive application restarts. Do not seed dummy data; implement empty states, validation, deletion confirmation, and error reporting.",
        "Treat 412×892 as the reference logical window size and use anchors/layouts so the desktop window remains usable when resized.",
        "Keep explicitly single-row content in RowLayout or equivalent and preserve intentional overlap with the correct QML z-order.",
        "Manage screen history with StackView or equivalent, and make Back, keyboard operation, and window behavior natural for a desktop app.",
        "Bundle Material Symbols Rounded correctly where used instead of replacing icons with arbitrary text glyphs.",
        "Include dependency metadata such as pyproject/requirements, startup instructions, testable source, and a configuration capable of producing a distributable executable with PyInstaller or equivalent.",
      ],
    },
  },
  zh: {
    generalHeading: "## 整体原则",
    targetLabel: "实现目标",
    platform: {
      neutral: "实现目标为平台无关（Platform neutral）。不要绑定特定操作系统、UI 框架或打包格式；把设计意图和行为映射到最终目标环境的标准技术。",
      ios: "实现目标是 iOS 原生应用，使用 Swift + SwiftUI。",
      pyside: "实现目标是桌面应用，使用 Python 3 + PySide6，并以 Qt Quick/QML + Qt Quick Controls 2 为主要 UI 技术栈。",
    },
    dynamicPrefix: "使用动态配色：",
    dynamic: {
      neutral: "使用动态配色：如果最终平台能安全提供用户强调色，可将其作为种子；否则使用下方色彩角色作为备用。不要假设存在某个操作系统专属 API。",
      ios: "使用动态配色：可用且合适时使用 iOS 的 tint / accent，否则使用下方色彩角色作为备用。不要使用 Android 壁纸生成的 Dynamic Color API。",
      pyside: "使用动态配色：仅在能够跨平台可靠获取主机 OS / Qt 强调色时使用，否则使用下方色彩角色作为备用。不要依赖 Android 专属 API。",
    },
    motionStandard: {
      neutral: "按 Material 3 standard motion 的意图，用目标平台原生动画 API 实现平滑、无弹跳的过渡和状态变化；不要假设存在 MotionScheme API。",
      ios: "把 Material 3 standard motion 映射到 SwiftUI Animation / withAnimation，使用平滑、无弹跳的过渡和状态变化；不要使用 MotionScheme API。",
      pyside: "把 Material 3 standard motion 映射到 QML Behavior / NumberAnimation 等，实现平滑、无弹跳的过渡和状态变化；不要使用 MotionScheme API。",
    },
    motionExpressive: {
      neutral: "按 Material 3 expressive motion 的意图，用目标平台原生动画 API 实现克制的弹簧感；不要假设存在 MotionScheme API。",
      ios: "把 Material 3 expressive motion 映射到克制的 SwiftUI spring 动画；不要使用 MotionScheme API。",
      pyside: "把 Material 3 expressive motion 映射到 QML easing / SpringAnimation 等，保持克制的弹簧感；不要使用 MotionScheme API。",
    },
    general: {
      neutral: [
        "根据屏幕目的判断产品类型，并在适用范围内实现该类产品通常需要的新建、列表、详情、编辑、删除、搜索、设置等功能。",
        "把用户数据当作真实数据，使用最终平台合适的持久化方式保存，使其在重启或重新加载后仍存在。不要预置假数据，并实现空状态、输入校验、失败提示和删除确认。",
        "根据屏幕目的和标签补全草图未写明的行为，不要留下无响应的交互元素。",
        "不要强制某个操作系统或框架。确定目标后优先使用该环境的标准组件、导航和无障碍机制，同时保留 Material 3 Expressive 的颜色、形状、间距和排版意图。",
        "所有色彩角色集中在单一主题层中，禁止在各屏幕直接写死颜色值。",
        "明确要求单行的组件必须保持同一行，重叠布局保持指定层级；必要时响应式调整以保证可用性。",
        "使用目标平台自然的交互反馈，并把返回操作接入该平台标准的导航历史和规范。",
        "保持图标语义；有原生等价图标时使用等价项，需要精确 Material Symbols Rounded 外观时将其作为正式资源处理。",
        "提供可复现的 production build 步骤，以及适合所选环境的可运行成果物或可构建工程。",
      ],
      ios: [
        "根据屏幕目的判断产品类型，并补全草图未画出的常规功能。",
        "UI 以 SwiftUI 为主，优先使用 NavigationStack、sheet、alert、标准控件和 iOS 无障碍 API。把 Material 3 Expressive 数值映射到集中管理的 Swift 主题/token 层，不要移植 Android API。",
        "结构化用户数据使用 SwiftData，轻量设置使用 AppStorage / UserDefaults 等合适方式持久化，并实现空状态、校验、删除确认和错误提示。",
        "使用 NavigationStack 并保留 iOS 标准的交互式返回手势，把设计中的过渡意图映射到 SwiftUI transition。",
        "所有 Material 3 色彩角色通过集中管理的 SwiftUI 主题引用，不要在 View 内硬编码颜色。",
        "单行约束用 HStack 等保持，重叠关系用 ZStack 等保持。",
        "优先使用语义相同的 SF Symbols；只有确实需要 Material Symbols Rounded 的精确外观时才正确打包相应资源。",
        "交付可由 Xcode 构建的工程和 Release 配置。除非提供 Apple Developer 签名身份和 Provisioning Profile，否则不要求已签名 IPA。",
      ],
      pyside: [
        "根据屏幕目的判断产品类型，并补全新建、列表、详情、编辑、删除、搜索、设置等常规功能。",
        "使用 Python 3 + PySide6，以 Qt Quick/QML + Qt Quick Controls 2 实现响应式 UI 和动效。Material 3 Expressive 的色彩角色、形状、排版和间距集中在 Theme singleton/token 层。",
        "结构化用户数据使用 SQLite，轻量设置使用 QSettings，并保证应用重启后仍保留。不要预置假数据，并实现空状态、校验、删除确认和错误提示。",
        "把 412×892 作为参考逻辑窗口尺寸，使用 anchors/layouts 确保桌面窗口缩放后仍可用。",
        "单行内容使用 RowLayout 等保持同一行，重叠内容保持正确的 QML z-order。",
        "使用 StackView 等管理页面历史，并让返回、键盘操作和窗口行为符合桌面应用习惯。",
        "正确打包 Material Symbols Rounded 资源，不要用任意文本字符替代图标。",
        "包含 pyproject/requirements 等依赖定义、启动说明、可测试源码，并提供可通过 PyInstaller 等生成可分发可执行文件的配置。",
      ],
    },
  },
  ko: {
    generalHeading: "## 전체 지침",
    targetLabel: "구현 대상",
    platform: {
      neutral: "구현 대상은 플랫폼 중립(Platform neutral)이다. 특정 OS, UI 프레임워크 또는 패키지 형식에 고정하지 말고 설계 의도와 동작을 최종 환경의 표준 기술에 매핑한다.",
      ios: "iOS 네이티브 앱으로 구현하며 Swift + SwiftUI를 사용한다.",
      pyside: "Python 3 + PySide6 데스크톱 앱으로 구현하며 Qt Quick/QML + Qt Quick Controls 2를 기본 UI 스택으로 사용한다.",
    },
    dynamicPrefix: "동적 색상을 사용한다.",
    dynamic: {
      neutral: "동적 색상을 사용한다. 최종 플랫폼이 사용자 강조 색상을 안전하게 제공하면 이를 시드로 사용하고, 그렇지 않으면 아래 색상 역할을 폴백으로 사용한다. 특정 OS API를 전제로 하지 않는다.",
      ios: "동적 색상을 사용한다. 사용 가능하고 적절하면 iOS tint/accent를 반영하고, 그렇지 않으면 아래 색상 역할을 폴백으로 사용한다. Android 배경화면 기반 Dynamic Color API는 사용하지 않는다.",
      pyside: "동적 색상을 사용한다. 호스트 OS/Qt 강조 색상을 이식성 있게 얻을 수 있을 때만 사용하고, 그렇지 않으면 아래 색상 역할을 폴백으로 사용한다. Android 전용 API에 의존하지 않는다.",
    },
    motionStandard: {
      neutral: "Material 3 standard motion 의도를 대상 플랫폼의 기본 애니메이션 API에 매핑해 튀지 않는 부드러운 전환과 상태 변화를 구현한다. MotionScheme API의 존재를 전제로 하지 않는다.",
      ios: "Material 3 standard motion을 SwiftUI Animation / withAnimation에 매핑해 튀지 않는 부드러운 전환과 상태 변화를 구현한다. MotionScheme API는 사용하지 않는다.",
      pyside: "Material 3 standard motion을 QML Behavior / NumberAnimation 등에 매핑해 튀지 않는 부드러운 전환과 상태 변화를 구현한다. MotionScheme API는 사용하지 않는다.",
    },
    motionExpressive: {
      neutral: "Material 3 expressive motion 의도를 대상 플랫폼의 기본 애니메이션 API에 매핑해 절제된 스프링 느낌을 적용한다. MotionScheme API의 존재를 전제로 하지 않는다.",
      ios: "Material 3 expressive motion을 절제된 SwiftUI spring 애니메이션에 매핑한다. MotionScheme API는 사용하지 않는다.",
      pyside: "Material 3 expressive motion을 QML easing / SpringAnimation 등에 매핑해 절제된 스프링 느낌을 적용한다. MotionScheme API는 사용하지 않는다.",
    },
    general: {
      neutral: [
        "화면 목적에서 제품 종류를 판단하고 해당되는 만들기, 목록, 상세, 편집, 삭제, 검색, 설정 등의 일반 기능을 구현한다.",
        "사용자 데이터를 실제 데이터로 취급하고 최종 대상에 맞는 저장소에 영속화해 재시작/새로고침 후에도 유지한다. 더미 데이터는 넣지 않고 빈 상태, 입력 검증, 실패 알림, 삭제 확인을 구현한다.",
        "화면 목적과 레이블을 바탕으로 스케치에 없는 동작을 보완하며 상호작용 요소를 무동작으로 남기지 않는다.",
        "특정 OS나 프레임워크를 강제하지 않는다. 대상이 정해지면 해당 환경의 표준 컴포넌트, 내비게이션, 접근성 기능을 우선하면서 Material 3 Expressive의 색상, 형태, 간격, 타이포그래피 의도를 유지한다.",
        "모든 색상 역할은 하나의 테마 계층에 집중시키고 개별 화면에 색상 값을 하드코딩하지 않는다.",
        "한 행으로 지정된 요소는 같은 행에 유지하고 의도된 겹침/z-order를 보존한다. 필요하면 사용성을 위해 반응형으로 조정한다.",
        "대상 플랫폼에 자연스러운 상호작용 피드백을 사용하고 뒤로 동작을 표준 내비게이션 기록과 규칙에 통합한다.",
        "아이콘 의미를 보존하며 기본 동등 아이콘이 있으면 사용하고 정확한 Material Symbols Rounded 모양이 필요하면 정식 자산으로 취급한다.",
        "재현 가능한 production build 절차와 선택한 환경에 맞는 실행 결과물 또는 빌드 가능한 프로젝트를 제공한다.",
      ],
      ios: [
        "화면 목적에서 제품 종류를 판단하고 스케치에 없는 일반 기능도 구현한다.",
        "SwiftUI를 기본 UI로 사용하고 NavigationStack, sheet, alert, 표준 컨트롤 및 iOS 접근성 API를 우선한다. Material 3 Expressive 값은 중앙 Swift 테마/token 계층에 매핑하고 Android API를 이식하지 않는다.",
        "구조화된 사용자 데이터는 SwiftData, 가벼운 설정은 AppStorage / UserDefaults 등으로 영속화하고 빈 상태, 검증, 삭제 확인, 오류 표시를 구현한다.",
        "NavigationStack을 사용하고 iOS 표준 대화형 뒤로 동작을 유지하면서 의도한 전환을 SwiftUI transition으로 매핑한다.",
        "Material 3 색상 역할은 중앙 SwiftUI 테마를 통해 참조하고 View 안에 색상 값을 하드코딩하지 않는다.",
        "한 행 제약은 HStack 등으로 유지하고 의도된 겹침은 ZStack 등으로 보존한다.",
        "의미가 같은 SF Symbols를 우선하고 Material Symbols Rounded의 정확한 외형이 필요한 경우에만 적절한 자산을 번들한다.",
        "Xcode에서 빌드 가능한 프로젝트와 Release 구성을 제공한다. Apple Developer 서명 ID와 Provisioning Profile이 제공되지 않으면 서명된 IPA를 필수로 요구하지 않는다.",
      ],
      pyside: [
        "화면 목적에서 제품 종류를 판단하고 만들기, 목록, 상세, 편집, 삭제, 검색, 설정 등의 일반 기능을 구현한다.",
        "Python 3 + PySide6와 Qt Quick/QML + Qt Quick Controls 2로 반응형 UI와 모션을 구현한다. Material 3 Expressive 역할, 형태, 타이포그래피, 간격은 중앙 Theme singleton/token 계층에 둔다.",
        "구조화된 사용자 데이터는 SQLite, 가벼운 설정은 QSettings에 영속화하고 앱 재시작 후에도 유지한다. 더미 데이터는 넣지 않고 빈 상태, 검증, 삭제 확인, 오류 알림을 구현한다.",
        "412×892를 기준 논리 창 크기로 보고 anchors/layouts를 사용해 데스크톱 창 크기 변경에도 사용 가능하게 만든다.",
        "한 행 내용은 RowLayout 등으로 유지하고 겹침은 올바른 QML z-order를 보존한다.",
        "StackView 등으로 화면 기록을 관리하고 뒤로, 키보드 조작, 창 동작을 데스크톱 앱에 맞게 구현한다.",
        "Material Symbols Rounded 자산을 올바르게 번들하고 임의의 텍스트 문자로 아이콘을 대체하지 않는다.",
        "pyproject/requirements 등 의존성 정의, 실행 방법, 테스트 가능한 소스와 PyInstaller 등으로 배포 가능한 실행 파일을 만들 수 있는 구성을 포함한다.",
      ],
    },
  },
};

export const platformTargetLabel = (lang: Lang) => COPY[lang].targetLabel;

function replaceViewportText(line: string, target: Platform, lang: Lang) {
  if (target !== "pyside" && target !== "neutral") return line;
  if (target === "pyside") {
    if (lang === "ja") return line.replace("想定はスマホの縦画面（412×892dp）で、", "基準ウィンドウは縦長 412×892 logical px とし、").replaceAll("デスクトップのブラウザ画面", "デスクトップのアプリ画面");
    if (lang === "en") return line.replace("Target a portrait phone screen (412×892dp)", "Use a 412×892 logical-pixel portrait window as the reference size").replaceAll("desktop browser viewport", "desktop application window");
    if (lang === "zh") return line.replace("目标为竖屏手机（412×892dp）", "参考窗口为竖向 412×892 logical px").replaceAll("桌面浏览器视口", "桌面应用窗口");
    return line.replace("세로형 휴대전화 화면(412×892dp)을 대상으로 하며", "세로형 412×892 logical px 창을 기준으로 하며").replaceAll("데스크톱 브라우저", "데스크톱 애플리케이션");
  }
  if (lang === "ja") return line.replaceAll("デスクトップのブラウザ画面", "デスクトップ画面");
  if (lang === "en") return line.replaceAll("desktop browser viewport", "desktop viewport");
  if (lang === "zh") return line.replaceAll("桌面浏览器视口", "桌面视口");
  return line.replaceAll("데스크톱 브라우저", "데스크톱");
}

export function adaptPromptForPlatform(prompt: string, target: Platform, lang: Lang): string {
  if (target === "android" || target === "web") return prompt;

  const copy = COPY[lang];
  const lines = prompt.split("\n");
  if (lines.length > 1) lines[1] = replaceViewportText(lines[1], target, lang);
  if (lines.length > 2) lines[2] = copy.platform[target];

  const dynamicIndex = lines.findIndex((line) => line.startsWith(copy.dynamicPrefix));
  if (dynamicIndex >= 0) lines[dynamicIndex] = copy.dynamic[target];

  const motionIndex = lines.findIndex((line) => line.includes("MotionScheme.standard()") || line.includes("MotionScheme.expressive()"));
  if (motionIndex >= 0) {
    const prefix = lines[motionIndex].startsWith("- ") ? "- " : "";
    lines[motionIndex] = prefix + (lines[motionIndex].includes("expressive") ? copy.motionExpressive[target] : copy.motionStandard[target]);
  }

  const generalIndex = lines.indexOf(copy.generalHeading);
  if (generalIndex >= 0) {
    lines.splice(generalIndex + 1, lines.length - generalIndex - 1, ...copy.general[target].map((line) => `- ${line}`));
  }
  return lines.join("\n");
}
