"use client";

import { useEffect, useMemo, useState } from "react";
import { M3Static, Icon } from "./M3Node";
import { IconBtn } from "./ui";
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

type CompareSlot = string | null;

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

function labels(lang: ReturnType<typeof useLang>) {
  if (lang === "ja") {
    return {
      title: "比較 / バリアント",
      subtitle: "既存の画面を同じ元データから並べて比較します。比較用の画面コピーは作りません。",
      slot: "比較枠",
      none: "未選択",
      canvas: "Canvasで開く",
      preview: "プレビュー",
      variant: "バリアントを作成",
      empty: "比較できる画面がありません。",
      one: "画面が1つだけです。バリアントを作成すると並べて比較できます。",
      parts: "部品",
      source: "比較元",
    };
  }
  if (lang === "zh") {
    return {
      title: "比较 / 变体",
      subtitle: "并排比较现有画面，继续使用同一份源数据，不创建独立的比较副本。",
      slot: "比较槽",
      none: "未选择",
      canvas: "在 Canvas 中打开",
      preview: "预览",
      variant: "创建变体",
      empty: "没有可比较的画面。",
      one: "目前只有一个画面。创建变体后即可并排比较。",
      parts: "组件",
      source: "比较基准",
    };
  }
  if (lang === "ko") {
    return {
      title: "비교 / 변형",
      subtitle: "기존 화면을 같은 원본 데이터에서 나란히 비교합니다. 별도 비교 사본은 만들지 않습니다.",
      slot: "비교 슬롯",
      none: "선택 안 함",
      canvas: "Canvas에서 열기",
      preview: "미리보기",
      variant: "변형 만들기",
      empty: "비교할 화면이 없습니다.",
      one: "화면이 하나뿐입니다. 변형을 만들면 나란히 비교할 수 있습니다.",
      parts: "부품",
      source: "기준",
    };
  }
  return {
    title: "Compare / variants",
    subtitle: "Compare existing screens side by side from the same source data. No separate compare copy is created.",
    slot: "Compare slot",
    none: "Not selected",
    canvas: "Open on canvas",
    preview: "Preview",
    variant: "Create variant",
    empty: "There are no screens to compare.",
    one: "There is only one screen. Create a variant to compare them side by side.",
    parts: "parts",
    source: "Baseline",
  };
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
                style={{
                  position: "absolute",
                  left: placed.x - frame.x,
                  top: placed.y - frame.y,
                }}
              >
                <M3Static
                  item={placed.item}
                  palette={palette}
                  radii={corners.get(placed.item.id)}
                  style={
                    MEASURED.includes(placed.item.kind)
                      ? undefined
                      : { width: placed.w, height: placed.h }
                  }
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
                const radii =
                  connection && count > 1
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
                    style={
                      MEASURED.includes(item.kind)
                        ? undefined
                        : { width: size.w, height: size.h }
                    }
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
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              fontSize: 12,
              color: p.onSurfaceVariant,
            }}
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
