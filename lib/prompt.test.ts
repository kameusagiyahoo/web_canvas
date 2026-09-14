import { afterEach, describe, expect, it } from "vitest";

import { Lang, setGlobalLang } from "./i18n";
import { buildPrompt } from "./prompt";
import { BACK_TARGET, Doc, Item, Platform, defaultTabs, makeItem } from "./tokens";

const LANGS: Lang[] = ["ja", "en", "zh", "ko"];

/* Section headings in the order buildPrompt must emit them. */
const SECTIONS: Record<Lang, string[]> = {
  ja: ["## カラー", "## 形・文字・動き", "## 画面構成", "## 振る舞いと画面遷移", "## 各部品のスタイル", "## 全体の指針"],
  en: ["## Colors", "## Shape, type and motion", "## Layout", "## Behavior and navigation", "## Component styles", "## General guidance"],
  zh: ["## 配色", "## 形状、字体与动效", "## 屏幕结构", "## 行为与屏幕跳转", "## 各组件的样式", "## 整体原则"],
  ko: ["## 색상", "## 모양, 글꼴 및 모션", "## 화면 구성", "## 동작 및 화면 전환", "## 부품별 스타일", "## 전체 지침"],
};

const PLATFORM_LINE: Record<Lang, Record<"android" | "web", string>> = {
  ja: { android: "実装先は Android（ネイティブアプリ）です。", web: "実装先は Web（ブラウザで動くアプリ）です。" },
  en: { android: "Build it for Android, as a native app.", web: "Build it for the web, as an app that runs in the browser." },
  zh: { android: "实现目标是 Android（原生应用）。", web: "实现目标是 Web（在浏览器中运行的应用）。" },
  ko: { android: "Android 네이티브 앱으로 구현한다.", web: "브라우저에서 실행되는 웹 앱으로 구현한다." },
};

/* One phone screen with a top app bar, a connected pair of buttons (one with a
 * tap action) and a navigation bar. makeItem / defaultTabs fill in the defaults;
 * module-level language is set first so those defaults follow the test. */
function fixture(platform: Platform = "android", extraItems: Item[] = []): Doc {
  const bar: Item = { ...makeItem("topAppBar"), id: "bar", label: "Home" };
  const save: Item = { ...makeItem("button"), id: "save", label: "Save", action: { to: BACK_TARGET, transition: "fade" } };
  const cancel: Item = { ...makeItem("button"), id: "cancel", label: "Cancel", variant: "text" };
  const nav: Item = { ...makeItem("bottomNav"), id: "nav", tabs: defaultTabs() };
  return {
    groups: [
      { id: "g-bar", x: 16, y: 24, axis: "x", items: [bar] },
      { id: "g-row", x: 16, y: 400, axis: "x", items: [save, cancel, ...extraItems] },
      { id: "g-nav", x: 16, y: 812, axis: "x", items: [nav] },
    ],
    frames: [{ id: "f-home", name: "Home", x: 0, y: 0 }],
    paletteKey: "purple",
    frame: "phone",
    platform,
    title: "Notes",
    brief: "",
  };
}

/* Set the module-level language for the fixture helpers, then build explicitly
 * in that language — nothing is left to ambient state. */
function build(lang: Lang, platform: Platform = "android", extraItems: Item[] = []) {
  setGlobalLang(lang);
  return buildPrompt(fixture(platform, extraItems), {}, undefined, lang);
}

const lines = (prompt: string) => prompt.split("\n");
const headings = (prompt: string) => lines(prompt).filter((l) => l.startsWith("## "));
/* bullet lines between the style heading and the closing guidance heading */
function styleBullets(prompt: string, lang: Lang) {
  const ls = lines(prompt);
  const style = ls.indexOf(SECTIONS[lang][4]);
  const general = ls.indexOf(SECTIONS[lang][5]);
  return ls.slice(style + 1, general).filter((l) => l.startsWith("- "));
}

const QUOTED: Record<Lang, { label: string; others: string[] }> = {
  ja: { label: "「Save」", others: ['"Save"', "“Save”"] },
  en: { label: '"Save"', others: ["「Save」", "“Save”"] },
  zh: { label: "“Save”", others: ["「Save」", '"Save"'] },
  ko: { label: '"Save"', others: ["「Save」", "“Save”"] },
};

describe("buildPrompt structure", () => {
  afterEach(() => setGlobalLang("ja")); // restore the module default

  it.each(LANGS)("orders its sections the same way in %s", (lang) => {
    expect(headings(build(lang))).toEqual(SECTIONS[lang]);
  });

  it.each(LANGS)("preserves the Android and Web target lines in %s", (lang) => {
    expect(lines(build(lang, "android"))[2]).toBe(PLATFORM_LINE[lang].android);
    expect(lines(build(lang, "web"))[2]).toBe(PLATFORM_LINE[lang].web);
  });

  it("defaults an unconfigured design to platform-neutral instead of Android", () => {
    setGlobalLang("en");
    const { platform, ...doc } = fixture();
    const prompt = buildPrompt(doc, {}, undefined, "en");
    expect(lines(prompt)[2]).toContain("platform-neutral");
    expect(prompt).not.toContain("Jetpack Compose");
    expect(prompt).not.toContain("Room, DataStore");
    expect(prompt).not.toContain("release APK");
  });

  it("maps iOS to SwiftUI without leaking Android implementation requirements", () => {
    const prompt = build("en", "ios");
    expect(lines(prompt)[2]).toContain("native iOS app");
    expect(prompt).toContain("SwiftUI");
    expect(prompt).toContain("SwiftData");
    expect(prompt).toContain("NavigationStack");
    expect(prompt).not.toContain("Jetpack Compose");
    expect(prompt).not.toContain("Room, DataStore");
    expect(prompt).not.toContain("release APK");
  });

  it("maps PySide to a desktop Qt stack and distributable desktop build", () => {
    const prompt = build("en", "pyside");
    expect(lines(prompt)[2]).toContain("Python 3 and PySide6");
    expect(prompt).toContain("Qt Quick/QML");
    expect(prompt).toContain("SQLite");
    expect(prompt).toContain("QSettings");
    expect(prompt).toContain("PyInstaller");
    expect(prompt).not.toContain("Jetpack Compose");
    expect(prompt).not.toContain("release APK");
  });

  it("keeps Android and Web technology-specific deliverables when explicitly selected", () => {
    const android = build("en", "android");
    const web = build("en", "web");
    expect(android).toContain("Jetpack Compose material3");
    expect(android).toContain("signed release APK");
    expect(web).toContain("Material Web");
    expect(web).toContain("IndexedDB");
    expect(web).toContain("production build");
  });

  it.each(LANGS)("writes one style note per part kind in use in %s", (lang) => {
    expect(styleBullets(build(lang), lang)).toHaveLength(3); // topAppBar, button, bottomNav
    const chip: Item = { ...makeItem("chip"), id: "chip" };
    expect(styleBullets(build(lang, "android", [chip]), lang)).toHaveLength(4);
  });

  it.each(LANGS)("quotes labels with %s punctuation", (lang) => {
    const prompt = build(lang);
    expect(prompt).toContain(QUOTED[lang].label);
    for (const other of QUOTED[lang].others) expect(prompt).not.toContain(other);
  });

  it("follows its lang argument regardless of ambient module state", () => {
    setGlobalLang("en");
    const doc = fixture();
    setGlobalLang("zh");
    const prompt = buildPrompt(doc, {}, undefined, "ja");
    expect(headings(prompt)).toEqual(SECTIONS.ja);
    expect(prompt).toContain("「Save」");
  });
});
