"use client";

import { useEffect, useMemo, useState } from "react";
import { compareFrames, type CompareDiffEntry, type CompareDiffSummary } from "@/lib/compare-diff";
import { useLang } from "@/lib/i18n";
import { interpolatedRunRadii } from "@/lib/run-radii";
import {
  GAP,
  MEASURED,
  baseRadii,
  connectSpecOf,
  frameOfGroup,
  frameRadius,
  frameSizeOf,
  freeRadii,
  layoutOf,
  sizeOf,
  uniformRadii,
  type Frame,
  type Group,
  type Palette,
} from "@/lib/tokens";
import { Icon, M3Static } from "./M3Node";
import { IconBtn } from "./ui";

type CompareSlot = string | null;
type Lang = ReturnType<typeof useLang>;

export type CompareWorkspaceProps = {
  frames: Frame[];
  groups: Group[];
  widths: Record<string, number>;
  palette: Palette;
  initialFrameId?: string | null;
  mobile?: boolean;
  onClose: () => void;
  onFocusFrame: (frameId: string) => void;
  onPreviewFrame: (frameId: string) => void;
  onCreateVariant: (frameId: string) => string | null;
};

function labels(lang: Lang) {
  if (lang === "ja") {
    return {
      title: "比較 / バリアント",
      subtitle: "既存の画面を同じ元データから並べて比較します。Aを基準に構造差分も自動検出します。",
      slot: "比較枠",
      none: "未選択",
      canvas: "Canvasで開く",
      preview: "プレビュー",
      variant: "バリアントを作成",
      empty: "比較できる画面がありません。",
      one: "画面が1つだけです。バリアントを作成すると並べて比較できます。",
      parts: "部品",
      source: "比較元",
      diff: "Aとの差分",
      same: "構造上の差分なし",
      changes: "件の差分",
      more: "件を省略",
      categories: {
        screen: "画面",
        added: "追加",
        removed: "削除",
        content: "内容",
        style: "見た目",
        layout: "配置",
        navigation: "遷移",
      },
    };
  }
  if (lang === "zh") {
    return {
      title: "比较 / 变体",
      subtitle: "并排比较现有画面，并以 A 为基准自动检测结构差异。",
      slot: "比较槽",
      none: "未选择",
      canvas: "在 Canvas 中打开",
      preview: "预览",
      variant: "创建变体",
      empty: "没有可比较的画面。",
      one: "目前只有一个画面。创建变体后即可并排比较。",
      parts: "组件",
      source: "比较基准",
      diff: "与 A 的差异",
      same: "无结构差异",
      changes: "项差异",
      more: "项已省略",
      categories: {
        screen: "画面",
        added: "新增",
        removed: "删除",
        content: "内容",
        style: "样式",
        layout: "布局",
        navigation: "导航",
      },
    };
  }
  if (lang === "ko") {
    return {
      title: "비교 / 변형",
      subtitle: "기존 화면을 나란히 비교하고 A를 기준으로 구조 차이를 자동 감지합니다.",
      slot: "비교 슬롯",
      none: "선택 안 함",
      canvas: "Canvas에서 열기",
      preview: "미리보기",
      variant: "변형 만들기",
      empty: "비교할 화면이 없습니다.",
      one: "화면이 하나뿐입니다. 변형을 만들면 나란히 비교할 수 있습니다.",
      parts: "부품",
      source: "기준",
      diff: "A와의 차이",
      same: "구조 차이 없음",
      changes: "개 차이",
      more: "개 생략",
      categories: {
        screen: "화면",
        added: "추가",
        removed: "삭제",
        content: "내용",
        style: "스타일",
        layout: "배치",
        navigation: "이동",
      },
    };
  }
  return {
    title: "Compare / variants",
    subtitle: "Compare existing screens side by side and automatically derive structural differences from A.",
    slot: "Compare slot",
    none: "Not selected",
    canvas: "Open on canvas",
    preview: "Preview",
    variant: "Create variant",
    empty: "There are no screens to compare.",
    one: "There is only one screen. Create a variant to compare them side by side.",
    parts: "parts",
    source: "Baseline",
    diff: "Differences from A",
    same: "No structural differences",
    changes: "changes",
    more: "more",
    categories: {
      screen: "Screen",
      added: "Added",
      removed: "Removed",
      content: "Content",
      style: "Style",
      layout: "Layout",
      navigation: "Navigation",
    },
  };
}

function propertyLabel(property: string, lang: Lang): string {
  const en: Record<string, string> = {
    width: "width",
    height: "height",
    background: "background",
    swipeTargets: "swipe",
    label: "label",
    supporting: "supporting text",
    icon: "icon",
    secondaryIcon: "secondary icon",
    tabs: "tabs",
    selected: "selection",
    checked: "checked state",
    value: "value",
    bold: "bold",
    switch: "trailing switch",
    image: "image",
    variant: "variant",
    fill: "fill",
    iconFill: "icon fill",
    wavy: "wavy",
    contained: "contained",
    corners: "corners",
    toggle: "toggle look",
    x: "x position",
    y: "y position",
    tapTarget: "tap target",
    slotTargets: "slot targets",
    part: "part",
  };
  const ja: Record<string, string> = {
    width: "幅",
    height: "高さ",
    background: "背景",
    swipeTargets: "スワイプ遷移",
    label: "ラベル",
    supporting: "補助テキスト",
    icon: "アイコン",
    secondaryIcon: "副アイコン",
    tabs: "タブ",
    selected: "選択状態",
    checked: "ON/OFF",
    value: "値",
    bold: "太字",
    switch: "末尾スイッチ",
    image: "画像",
    variant: "スタイル",
    fill: "背景色ロール",
    iconFill: "アイコン背景",
    wavy: "波形",
    contained: "内包表示",
    corners: "角丸",
    toggle: "トグル時の見た目",
    x: "X位置",
    y: "Y位置",
    tapTarget: "タップ遷移先",
    slotTargets: "各スロットの遷移先",
    part: "部品",
  };
  return (lang === "ja" ? ja[property] : en[property]) ?? property;
}

function initialSlots(frames: Frame[], initialFrameId?: string | null): CompareSlot[] {
  const ordered = initialFrameId
    ? [
        ...frames.filter((frame) => frame.id === initialFrameId),
        ...frames.filter((frame) => frame.id !== initialFrameId),
      ]
    : frames;
  return [ordered[0]?.id ?? null, ordered[1]?.id ?? null, ordered[2]?.id ?? null];
}

function FrameMiniature({
  frame,
  frames,
  groups,
  widths,
  palette,
  mobile,
}: {
  frame: Frame;
  frames: Frame[];
  groups: Group[];
  widths: Record<string, number>;
  palette: Palette;
  mobile?: boolean;
}) {
  const owned = useMemo(
    () => groups.filter((group) => frameOfGroup(group, frames, widths)?.id === frame.id),
    [frame.id, frames, groups, widths],
  );
  const { w, h } = frameSizeOf(frame);
  const maxW = mobile ? 260 : 310;
  const maxH = mobile ? 390 : 470;
  const scale = Math.min(1, maxW / w, maxH / h);
  const shownW = Math.round(w * scale);
  const shownH = Math.round(h * scale);

  return (
    <div
      style={{
        width: shownW,
        height: shownH,
        position: "relative",
        margin: "0 auto",
        borderRadius: Math.max(8, frameRadius(frame) * scale),
        overflow: "hidden",
        boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
        background: palette[frame.bg ?? "surface"],
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: palette[frame.bg ?? "surface"],
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {owned.map((group) => {
          if (group.free) {
            const corners = freeRadii(group, widths);
            return layoutOf(group, widths).map((placed) => (
              <div
                key={placed.item.id}
                style={{ position: "absolute", left: placed.x - frame.x, top: placed.y - frame.y }}
              >
                <M3Static
                  item={placed.item}
                  palette={palette}
                  radii={corners.get(placed.item.id)}
                  style={MEASURED.includes(placed.item.kind) ? undefined : { width: placed.w, height: placed.h }}
                />
              </div>
            ));
          }

          return (
            <div
              key={group.id}
              style={{
                position: "absolute",
                left: group.x - frame.x,
                top: group.y - frame.y,
                display: "flex",
                flexDirection: group.axis === "x" ? "row" : "column",
                alignItems: group.axis === "x" ? "center" : "stretch",
                gap: GAP,
              }}
            >
              {group.items.map((item, index) => {
                const connection = connectSpecOf(item);
                const count = group.items.length;
                const radii = connection && count > 1
                  ? interpolatedRunRadii(
                      group.axis,
                      index === 0,
                      index === count - 1,
                      false,
                      false,
                      0,
                      connection.outer,
                      connection.inner,
                    )
                  : connection
                    ? uniformRadii(connection.outer)
                    : baseRadii(item);
                const size = sizeOf(item, widths);
                return (
                  <M3Static
                    key={item.id}
                    item={item}
                    palette={palette}
                    radii={radii}
                    style={MEASURED.includes(item.kind) ? undefined : { width: size.w, height: size.h }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiffRow({ entry, palette: p, lang }: { entry: CompareDiffEntry; palette: Palette; lang: Lang }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(110px, 0.8fr) minmax(0, 1.4fr)",
        gap: 8,
        padding: "7px 0",
        borderTop: `1px solid ${p.outlineVariant}`,
        fontSize: 11,
        lineHeight: 1.35,
      }}
    >
      <div style={{ minWidth: 0, fontWeight: 720, color: p.onSurface }}>
        {entry.subject}
      </div>
      <div style={{ minWidth: 0, color: p.onSurfaceVariant, overflowWrap: "anywhere" }}>
        <strong style={{ color: p.onSurface }}>{propertyLabel(entry.property, lang)}</strong>
        {entry.before !== undefined && entry.after !== undefined ? ` · ${entry.before} → ${entry.after}` : ""}
      </div>
    </div>
  );
}

function DiffPanel({
  summary,
  palette: p,
  lang,
  mobile,
  frameId,
}: {
  summary: CompareDiffSummary;
  palette: Palette;
  lang: Lang;
  mobile?: boolean;
  frameId: string;
}) {
  const text = labels(lang);
  const shown = summary.entries.slice(0, mobile ? 5 : 8);
  const hidden = summary.entries.length - shown.length;
  const activeCategories = Object.entries(summary.counts).filter(([, count]) => count > 0) as Array<[
    keyof typeof text.categories,
    number,
  ]>;

  return (
    <div
      data-testid={`compare-diff-${frameId}`}
      style={{
        margin: "0 12px 12px",
        padding: "10px 12px",
        borderRadius: 16,
        background: summary.total === 0 ? p.secondaryContainer : p.surfaceContainerHigh,
        color: summary.total === 0 ? p.onSecondaryContainer : p.onSurface,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name={summary.total === 0 ? "check_circle" : "difference"} size={18} />
        <span style={{ fontSize: 12, fontWeight: 780 }}>{text.diff}</span>
        <span
          data-testid={`compare-diff-count-${frameId}`}
          style={{ marginLeft: "auto", fontSize: 11, fontWeight: 760 }}
        >
          {summary.total === 0 ? text.same : `${summary.total} ${text.changes}`}
        </span>
      </div>

      {summary.total > 0 && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {activeCategories.map(([category, count]) => (
              <span
                key={category}
                style={{
                  minHeight: 24,
                  padding: "0 8px",
                  borderRadius: 12,
                  background: category === "added"
                    ? p.primaryContainer
                    : category === "removed"
                      ? p.errorContainer
                      : p.surfaceContainerHighest,
                  color: category === "added"
                    ? p.onPrimaryContainer
                    : category === "removed"
                      ? p.onErrorContainer
                      : p.onSurfaceVariant,
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 10,
                  fontWeight: 720,
                }}
              >
                {text.categories[category]} {count}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 5 }}>
            {shown.map((entry, index) => (
              <DiffRow key={`${entry.category}-${entry.subject}-${entry.property}-${index}`} entry={entry} palette={p} lang={lang} />
            ))}
            {hidden > 0 && (
              <div style={{ paddingTop: 7, fontSize: 10, color: p.onSurfaceVariant }}>
                +{hidden} {text.more}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function CompareWorkspace({
  frames,
  groups,
  widths,
  palette: p,
  initialFrameId,
  mobile,
  onClose,
  onFocusFrame,
  onPreviewFrame,
  onCreateVariant,
}: CompareWorkspaceProps) {
  const lang = useLang();
  const text = labels(lang);
  const [slots, setSlots] = useState<CompareSlot[]>(() => initialSlots(frames, initialFrameId));

  useEffect(() => {
    setSlots((current) => {
      const existing = new Set(frames.map((frame) => frame.id));
      const next = current.map((id) => (id && existing.has(id) ? id : null));
      const chosen = new Set(next.filter((id): id is string => !!id));
      for (const frame of frames) {
        if (chosen.has(frame.id)) continue;
        const emptyIndex = next.findIndex((id) => id === null);
        if (emptyIndex < 0) break;
        next[emptyIndex] = frame.id;
        chosen.add(frame.id);
      }
      return next;
    });
  }, [frames]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setSlot = (index: number, value: string | null) => {
    setSlots((current) => {
      const next = [...current];
      const previous = next[index];
      if (value) {
        const duplicateIndex = next.findIndex((id, i) => i !== index && id === value);
        if (duplicateIndex >= 0) next[duplicateIndex] = previous;
      }
      next[index] = value;
      return next;
    });
  };

  const selectedFrames = slots
    .map((id) => frames.find((frame) => frame.id === id) ?? null)
    .filter((frame): frame is Frame => frame !== null);
  const baseline = selectedFrames[0] ?? null;
  const diffByFrame = new Map<string, CompareDiffSummary>();
  if (baseline) {
    for (const frame of selectedFrames.slice(1)) {
      diffByFrame.set(frame.id, compareFrames(baseline, frame, frames, groups, widths));
    }
  }

  const createVariant = (frameId: string) => {
    const nextId = onCreateVariant(frameId);
    if (!nextId) return;
    setSlots((current) => {
      const next = [...current];
      const emptyIndex = next.findIndex((id) => id === null);
      next[emptyIndex >= 0 ? emptyIndex : next.length - 1] = nextId;
      return next;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-workspace-title"
      data-testid="compare-workspace"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 82,
        display: "flex",
        flexDirection: "column",
        background: p.surface,
        color: p.onSurface,
      }}
    >
      <div
        style={{
          minHeight: 68,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: mobile ? "10px 14px" : "10px 20px",
          borderBottom: `1px solid ${p.outlineVariant}`,
          background: p.surfaceContainerLow,
          flex: "0 0 auto",
        }}
      >
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: p.secondaryContainer,
            color: p.onSecondaryContainer,
          }}
        >
          <Icon name="difference" size={24} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div id="compare-workspace-title" style={{ fontSize: 18, fontWeight: 780 }}>
            {text.title}
          </div>
          {!mobile && (
            <div style={{ marginTop: 2, fontSize: 12, color: p.onSurfaceVariant }}>
              {text.subtitle}
            </div>
          )}
        </div>
        <IconBtn icon="close" p={p} onClick={onClose} title={lang === "ja" ? "閉じる" : "Close"} size={44} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: mobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 10,
          padding: mobile ? "12px 12px 6px" : "12px 20px 8px",
          background: p.surface,
          flex: "0 0 auto",
        }}
      >
        {[0, 1, 2].map((index) => (
          <label
            key={index}
            style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, fontSize: 12, color: p.onSurfaceVariant }}
          >
            <span style={{ flex: "0 0 auto", fontWeight: 700 }}>{text.slot} {index + 1}</span>
            <select
              data-testid={`compare-slot-${index}`}
              value={slots[index] ?? ""}
              onChange={(event) => setSlot(index, event.target.value || null)}
              aria-label={`${text.slot} ${index + 1}`}
              style={{
                minWidth: 0,
                width: "100%",
                height: 40,
                padding: "0 34px 0 12px",
                borderRadius: 12,
                border: `1px solid ${p.outlineVariant}`,
                background: p.surfaceContainerHigh,
                color: p.onSurface,
                font: "inherit",
                cursor: "pointer",
              }}
            >
              <option value="">{text.none}</option>
              {frames.map((frame) => (
                <option key={frame.id} value={frame.id}>{frame.name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: mobile ? 12 : 20 }}>
        {frames.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: p.onSurfaceVariant }}>{text.empty}</div>
        ) : (
          <>
            {frames.length === 1 && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "10px 14px",
                  borderRadius: 14,
                  background: p.secondaryContainer,
                  color: p.onSecondaryContainer,
                  fontSize: 13,
                }}
              >
                {text.one}
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: mobile ? "1fr" : "repeat(3, minmax(260px, 1fr))",
                gap: 16,
                alignItems: "start",
              }}
            >
              {selectedFrames.map((frame, index) => {
                const owned = groups.filter((group) => frameOfGroup(group, frames, widths)?.id === frame.id);
                const partCount = owned.reduce((count, group) => count + group.items.length, 0);
                const size = frameSizeOf(frame);
                const diff = index === 0 ? null : diffByFrame.get(frame.id) ?? null;
                return (
                  <section
                    key={frame.id}
                    data-testid={`compare-frame-${frame.id}`}
                    style={{
                      minWidth: 0,
                      borderRadius: 24,
                      border: `1px solid ${p.outlineVariant}`,
                      background: p.surfaceContainerLow,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "14px 14px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: index === 0 ? p.primary : p.surfaceContainerHighest,
                          color: index === 0 ? p.onPrimary : p.onSurfaceVariant,
                          fontSize: 12,
                          fontWeight: 800,
                          flex: "0 0 auto",
                        }}
                      >
                        {index === 0 ? "A" : index === 1 ? "B" : "C"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15, fontWeight: 760 }}>
                          {frame.name}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 11, color: p.onSurfaceVariant }}>
                          {index === 0 ? `${text.source} · ` : ""}{size.w}×{size.h} · {partCount} {text.parts}
                        </div>
                      </div>
                    </div>

                    {diff && <DiffPanel summary={diff} palette={p} lang={lang} mobile={mobile} frameId={frame.id} />}

                    <div style={{ padding: "10px 12px 14px", display: "grid", placeItems: "center", minHeight: mobile ? 300 : 390 }}>
                      <FrameMiniature frame={frame} frames={frames} groups={groups} widths={widths} palette={p} mobile={mobile} />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: mobile ? "1fr" : "repeat(3, 1fr)",
                        gap: 8,
                        padding: 12,
                        borderTop: `1px solid ${p.outlineVariant}`,
                      }}
                    >
                      <button
                        type="button"
                        data-testid={`compare-focus-${frame.id}`}
                        onClick={() => onFocusFrame(frame.id)}
                        className="m3-press"
                        style={{ minHeight: 42, border: `1px solid ${p.outlineVariant}`, borderRadius: 21, background: p.surfaceContainerHigh, color: p.onSurface, cursor: "pointer", fontWeight: 700 }}
                      >
                        {text.canvas}
                      </button>
                      <button
                        type="button"
                        data-testid={`compare-preview-${frame.id}`}
                        onClick={() => onPreviewFrame(frame.id)}
                        className="m3-press"
                        style={{ minHeight: 42, border: `1px solid ${p.outlineVariant}`, borderRadius: 21, background: p.secondaryContainer, color: p.onSecondaryContainer, cursor: "pointer", fontWeight: 700 }}
                      >
                        {text.preview}
                      </button>
                      <button
                        type="button"
                        data-testid={`compare-create-variant-${frame.id}`}
                        onClick={() => createVariant(frame.id)}
                        className="m3-press"
                        style={{ minHeight: 42, border: "none", borderRadius: 21, background: p.primary, color: p.onPrimary, cursor: "pointer", fontWeight: 760 }}
                      >
                        {text.variant}
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
