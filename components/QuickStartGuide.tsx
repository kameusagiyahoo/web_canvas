"use client";

import { useEffect, useRef, useState } from "react";
import type { Palette } from "@/lib/tokens";
import type { Lang } from "@/lib/i18n";
import { useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";

export const QUICK_START_KEY = "m3e:quick-start:v1";

const COPY: Record<Lang, {
  title: string;
  intro: string;
  close: string;
  back: string;
  next: string;
  finish: string;
  step: string;
  reopen: string;
  steps: Array<{ icon: string; title: string; desktop: string; mobile: string }>;
}> = {
  ja: {
    title: "クイックスタート",
    intro: "5ステップで、画面遷移できるプロトタイプを作れます。",
    close: "ガイドを閉じる",
    back: "戻る",
    next: "次へ",
    finish: "作り始める",
    step: "ステップ",
    reopen: "このガイドは ? ボタンからいつでも開き直せます。",
    steps: [
      { icon: "add_to_photos", title: "画面を作る", desktop: "上部の「画面を追加」で2枚目の画面を作ります。", mobile: "下部の「Screen」から画面一覧を開き、「画面を追加」を押します。" },
      { icon: "add_box", title: "部品を置く", desktop: "左の「部品」パネルから Button などをドラッグして画面に置きます。", mobile: "下部の「＋」から部品を選ぶと、選択中の画面に追加されます。" },
      { icon: "link", title: "画面をつなぐ", desktop: "部品を選択し、右の Inspector の「アクション」で移動先の画面を指定します。", mobile: "部品を選択して「編集」を開き、「アクション」で移動先の画面を指定します。" },
      { icon: "play_arrow", title: "動きを確認する", desktop: "上部の ▶ Preview で、設定したボタンから実際に画面遷移できるか確認します。", mobile: "下部の ▶ Preview で、設定した画面遷移をそのまま試せます。" },
      { icon: "folder", title: "保存する", desktop: "Project メニューの Projects / Save now でローカルProjectを管理します。JSON書き出しはバックアップにも使えます。", mobile: "Screen → Projects からローカルProjectを管理します。JSON書き出しはバックアップにも使えます。" },
    ],
  },
  en: {
    title: "Quick start",
    intro: "Build a clickable prototype in five steps.",
    close: "Close guide",
    back: "Back",
    next: "Next",
    finish: "Start designing",
    step: "Step",
    reopen: "You can reopen this guide anytime from the ? button.",
    steps: [
      { icon: "add_to_photos", title: "Create screens", desktop: "Use Add screen in the top toolbar to create a second screen.", mobile: "Open Screen at the bottom, then choose Add screen." },
      { icon: "add_box", title: "Add parts", desktop: "Drag a Button or another part from the Parts panel on the left onto a screen.", mobile: "Open + at the bottom and choose a part. It is added to the active screen." },
      { icon: "link", title: "Connect screens", desktop: "Select a part and set its destination under Action in the Inspector on the right.", mobile: "Select a part, open Edit, and set its destination under Action." },
      { icon: "play_arrow", title: "Try the flow", desktop: "Use ▶ Preview in the top toolbar and click your configured control to test the transition.", mobile: "Use ▶ Preview at the bottom and test the transition directly." },
      { icon: "folder", title: "Save your project", desktop: "Use Project → Projects / Save now for local projects. JSON export is also a portable backup.", mobile: "Use Screen → Projects for local projects. JSON export is also a portable backup." },
    ],
  },
  zh: {
    title: "快速开始",
    intro: "用 5 个步骤制作可点击跳转的原型。",
    close: "关闭指南",
    back: "返回",
    next: "下一步",
    finish: "开始设计",
    step: "步骤",
    reopen: "以后可随时通过 ? 按钮重新打开本指南。",
    steps: [
      { icon: "add_to_photos", title: "创建屏幕", desktop: "使用顶部工具栏的“添加屏幕”创建第二个屏幕。", mobile: "打开底部的 Screen，然后选择“添加屏幕”。" },
      { icon: "add_box", title: "添加组件", desktop: "从左侧“组件”面板把 Button 等组件拖到屏幕上。", mobile: "打开底部的 + 并选择组件，它会添加到当前屏幕。" },
      { icon: "link", title: "连接屏幕", desktop: "选择组件，在右侧 Inspector 的“操作”中指定目标屏幕。", mobile: "选择组件，打开“编辑”，在“操作”中指定目标屏幕。" },
      { icon: "play_arrow", title: "测试流程", desktop: "使用顶部的 ▶ Preview，点击已配置的控件确认屏幕跳转。", mobile: "使用底部的 ▶ Preview，直接测试屏幕跳转。" },
      { icon: "folder", title: "保存项目", desktop: "通过 Project → Projects / Save now 管理本地项目；JSON 导出也可作为备份。", mobile: "通过 Screen → Projects 管理本地项目；JSON 导出也可作为备份。" },
    ],
  },
  ko: {
    title: "빠른 시작",
    intro: "5단계로 클릭 가능한 프로토타입을 만들 수 있습니다.",
    close: "가이드 닫기",
    back: "뒤로",
    next: "다음",
    finish: "디자인 시작",
    step: "단계",
    reopen: "이 가이드는 언제든 ? 버튼에서 다시 열 수 있습니다.",
    steps: [
      { icon: "add_to_photos", title: "화면 만들기", desktop: "상단 도구 모음의 Add screen으로 두 번째 화면을 만듭니다.", mobile: "하단 Screen을 열고 Add screen을 선택합니다." },
      { icon: "add_box", title: "부품 추가", desktop: "왼쪽 Parts 패널에서 Button 같은 부품을 화면으로 드래그합니다.", mobile: "하단 + 를 열고 부품을 선택하면 활성 화면에 추가됩니다." },
      { icon: "link", title: "화면 연결", desktop: "부품을 선택하고 오른쪽 Inspector의 Action에서 이동할 화면을 지정합니다.", mobile: "부품을 선택하고 Edit을 연 뒤 Action에서 이동할 화면을 지정합니다." },
      { icon: "play_arrow", title: "흐름 확인", desktop: "상단 ▶ Preview에서 설정한 컨트롤을 눌러 화면 전환을 확인합니다.", mobile: "하단 ▶ Preview에서 화면 전환을 직접 확인합니다." },
      { icon: "folder", title: "프로젝트 저장", desktop: "Project → Projects / Save now에서 로컬 프로젝트를 관리합니다. JSON 내보내기는 백업에도 사용할 수 있습니다.", mobile: "Screen → Projects에서 로컬 프로젝트를 관리합니다. JSON 내보내기는 백업에도 사용할 수 있습니다." },
    ],
  },
};

export function quickStartTitle(lang: Lang): string {
  return COPY[lang].title;
}

export function QuickStartGuide({ open, mobile, palette: p, onDismiss }: {
  open: boolean;
  mobile: boolean;
  palette: Palette;
  onDismiss: () => void;
}) {
  const lang = useLang();
  const copy = COPY[lang];
  const [index, setIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    queueMicrotask(() => closeRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open) return null;
  const current = copy.steps[index];
  const last = index === copy.steps.length - 1;

  return (
    <div
      data-testid="quick-start-guide"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-start-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.46)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          maxHeight: "min(680px, calc(100dvh - 32px))",
          overflowY: "auto",
          borderRadius: 28,
          background: p.surface,
          color: p.onSurface,
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          padding: mobile ? 20 : 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="quick-start-title" style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 800 }}>{copy.title}</div>
            <div style={{ marginTop: 6, color: p.onSurfaceVariant, fontSize: 14, lineHeight: 1.5 }}>{copy.intro}</div>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={copy.close}
            title={copy.close}
            onClick={onDismiss}
            className="m3-press"
            style={{ width: 42, height: 42, border: "none", borderRadius: 21, background: p.surfaceContainerHigh, color: p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer", flex: "0 0 auto" }}
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 20 }} aria-label={`${copy.step} ${index + 1} / ${copy.steps.length}`}>
          {copy.steps.map((_, i) => (
            <div key={i} style={{ height: 5, flex: 1, borderRadius: 3, background: i <= index ? p.primary : p.surfaceContainerHighest }} />
          ))}
        </div>

        <div style={{ marginTop: 22, padding: mobile ? 18 : 22, borderRadius: 22, background: p.surfaceContainerLow }}>
          <div style={{ width: 52, height: 52, borderRadius: 18, background: p.primaryContainer, color: p.onPrimaryContainer, display: "grid", placeItems: "center" }}>
            <Icon name={current.icon} size={28} />
          </div>
          <div style={{ marginTop: 14, color: p.primary, fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>{copy.step} {index + 1}</div>
          <div style={{ marginTop: 4, fontSize: 20, fontWeight: 800 }}>{current.title}</div>
          <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.65, color: p.onSurfaceVariant }}>{mobile ? current.mobile : current.desktop}</div>
        </div>

        <div style={{ marginTop: 14, color: p.onSurfaceVariant, fontSize: 12, lineHeight: 1.5 }}>{copy.reopen}</div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="m3-press"
            style={{ minWidth: 92, height: 46, padding: "0 18px", border: "none", borderRadius: 23, background: p.surfaceContainerHigh, color: p.onSurfaceVariant, fontSize: 14, fontWeight: 700, cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.4 : 1 }}
          >
            {copy.back}
          </button>
          <button
            type="button"
            onClick={() => last ? onDismiss() : setIndex((value) => Math.min(copy.steps.length - 1, value + 1))}
            className="m3-press"
            style={{ minWidth: 120, height: 46, padding: "0 20px", border: "none", borderRadius: 23, background: p.primary, color: p.onPrimary, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
          >
            {last ? copy.finish : copy.next}
          </button>
        </div>
      </div>
    </div>
  );
}
