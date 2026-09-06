"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deriveNavigationGraph,
  layoutNavigationGraph,
  type NavigationEdge,
  type NavigationLayoutNode,
  type NavigationProblem,
} from "@/lib/navigation-graph";
import { BACK_TARGET, type Doc, type Palette } from "@/lib/tokens";
import type { NavigationEdgePatch } from "@/lib/navigation-graph-edit";
import { Icon } from "./M3Node";
import { useLang, type Lang } from "@/lib/i18n";

const COPY: Record<Lang, {
  title: string;
  subtitle: string;
  close: string;
  start: string;
  screens: string;
  routes: string;
  issues: string;
  noIssues: string;
  empty: string;
  tap: string;
  slot: string;
  swipe: string;
  back: string;
  preview: string;
  itemRoute: string;
  slotRoute: string;
  swipeRoute: string;
  missing: string;
  unreachable: string;
  noIncoming: string;
  parallel: string;
}> = {
  ja: {
    title: "画面フロー",
    subtitle: "画面と遷移を、現在のドキュメントから自動で可視化しています",
    close: "閉じる",
    start: "開始",
    screens: "画面",
    routes: "遷移",
    issues: "確認事項",
    noIssues: "問題は見つかりませんでした",
    empty: "画面がありません",
    tap: "タップ",
    slot: "スロット",
    swipe: "スワイプ",
    back: "戻る",
    preview: "この画面からプレビュー",
    itemRoute: "部品のタップ",
    slotRoute: "部品内の項目",
    swipeRoute: "画面スワイプ",
    missing: "リンク先の画面がありません",
    unreachable: "開始画面から到達できません",
    noIncoming: "この画面へ入る遷移がありません",
    parallel: "同じ画面間に複数の遷移があります",
  },
  en: {
    title: "Screen flow",
    subtitle: "A live overview derived from the current document",
    close: "Close",
    start: "Start",
    screens: "Screens",
    routes: "Routes",
    issues: "Checks",
    noIssues: "No flow issues found",
    empty: "No screens yet",
    tap: "Tap",
    slot: "Slot",
    swipe: "Swipe",
    back: "Back",
    preview: "Preview from this screen",
    itemRoute: "Item tap",
    slotRoute: "Item slot",
    swipeRoute: "Screen swipe",
    missing: "Target screen is missing",
    unreachable: "Not reachable from the start screen",
    noIncoming: "No incoming navigation",
    parallel: "Multiple routes connect the same screens",
  },
  zh: {
    title: "画面流程",
    subtitle: "根据当前文档自动生成的导航总览",
    close: "关闭",
    start: "开始",
    screens: "画面",
    routes: "跳转",
    issues: "检查项",
    noIssues: "未发现流程问题",
    empty: "还没有画面",
    tap: "点击",
    slot: "项目",
    swipe: "滑动",
    back: "返回",
    preview: "从此画面预览",
    itemRoute: "组件点击",
    slotRoute: "组件项目",
    swipeRoute: "画面滑动",
    missing: "目标画面不存在",
    unreachable: "无法从开始画面到达",
    noIncoming: "没有进入此画面的跳转",
    parallel: "相同画面之间存在多个跳转",
  },
  ko: {
    title: "화면 흐름",
    subtitle: "현재 문서에서 자동으로 만든 내비게이션 개요",
    close: "닫기",
    start: "시작",
    screens: "화면",
    routes: "이동",
    issues: "확인",
    noIssues: "흐름 문제가 없습니다",
    empty: "화면이 없습니다",
    tap: "탭",
    slot: "항목",
    swipe: "스와이프",
    back: "뒤로",
    preview: "이 화면부터 미리보기",
    itemRoute: "항목 탭",
    slotRoute: "항목 슬롯",
    swipeRoute: "화면 스와이프",
    missing: "대상 화면이 없습니다",
    unreachable: "시작 화면에서 도달할 수 없습니다",
    noIncoming: "이 화면으로 들어오는 이동이 없습니다",
    parallel: "같은 화면 사이에 여러 이동이 있습니다",
  },
};

const edgeStyle = (edge: NavigationEdge) => {
  if (edge.source === "swipe") return "8 7";
  if (edge.source === "slot") return "3 6";
  return undefined;
};

function edgePath(
  from: NavigationLayoutNode,
  to: NavigationLayoutNode,
  nodeWidth: number,
  nodeHeight: number,
  offset: number,
) {
  if (from.frameId === to.frameId) {
    const x = from.x + nodeWidth;
    const y = from.y + nodeHeight / 2 + offset;
    return `M ${x} ${y} C ${x + 74} ${y - 64}, ${x + 74} ${y + 64}, ${x} ${y + 24}`;
  }
  const forward = to.x >= from.x;
  const x1 = forward ? from.x + nodeWidth : from.x;
  const x2 = forward ? to.x : to.x + nodeWidth;
  const y1 = from.y + nodeHeight / 2 + offset;
  const y2 = to.y + nodeHeight / 2 + offset;
  const bend = Math.max(72, Math.abs(x2 - x1) * 0.45);
  const c1 = forward ? x1 + bend : x1 - bend;
  const c2 = forward ? x2 - bend : x2 + bend;
  return `M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`;
}

export function NavigationGraph({
  doc,
  widths,
  palette: p,
  selectedFrameId,
  onSelectFrame,
  onPreviewFrame,
  onEditEdge,
  onClose,
}: {
  doc: Doc;
  widths: Record<string, number>;
  palette: Palette;
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onPreviewFrame: (id: string) => void;
  onEditEdge: (edge: NavigationEdge, patch: NavigationEdgePatch) => void;
  onClose: () => void;
}) {
  const lang = useLang();
  const copy = COPY[lang];
  const editCopy = {
    destination: lang === "ja" ? "移動先" : lang === "zh" ? "目标画面" : lang === "ko" ? "대상 화면" : "Destination",
    remove: lang === "ja" ? "この遷移を削除" : lang === "zh" ? "删除此跳转" : lang === "ko" ? "이 이동 삭제" : "Remove route",
    back: lang === "ja" ? "戻る" : lang === "zh" ? "返回" : lang === "ko" ? "뒤로" : "Back",
  };
  const graph = useMemo(
    () => deriveNavigationGraph(doc, widths, selectedFrameId),
    [doc, widths, selectedFrameId],
  );
  const layout = useMemo(() => layoutNavigationGraph(graph), [graph]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const nodeById = useMemo(
    () => new Map(layout.nodes.map((node) => [node.frameId, node])),
    [layout.nodes],
  );
  const labelById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.frameId, node.label])),
    [graph.nodes],
  );
  const validEdges = graph.edges.filter((edge) => edge.validTarget);
  const pairIndex = new Map<string, number>();

  const problemText = (problem: NavigationProblem) => {
    if (problem.kind === "missing-target") {
      return `${labelById.get(problem.fromFrameId) ?? problem.fromFrameId} → ${problem.targetId}: ${copy.missing}`;
    }
    if (problem.kind === "unreachable") {
      return `${labelById.get(problem.frameId) ?? problem.frameId}: ${copy.unreachable}`;
    }
    if (problem.kind === "no-incoming") {
      return `${labelById.get(problem.frameId) ?? problem.frameId}: ${copy.noIncoming}`;
    }
    return `${labelById.get(problem.fromFrameId) ?? problem.fromFrameId} → ${labelById.get(problem.toFrameId) ?? problem.toFrameId}: ${copy.parallel} (${problem.edgeIds.length})`;
  };

  const selectedEdgeDescription = selectedEdge
    ? selectedEdge.source === "swipe"
      ? `${copy.swipeRoute}: ${selectedEdge.swipe ?? ""}`
      : selectedEdge.source === "slot"
        ? `${copy.slotRoute}: ${selectedEdge.itemLabel || selectedEdge.itemId || ""} / ${selectedEdge.slot ?? ""}`
        : `${copy.itemRoute}: ${selectedEdge.itemLabel || selectedEdge.itemId || ""}`
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      data-testid="navigation-graph"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 96,
        display: "flex",
        flexDirection: "column",
        background: p.surface,
        color: p.onSurface,
      }}
    >
      <header
        style={{
          minHeight: 72,
          padding: "max(12px, env(safe-area-inset-top)) 16px 10px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: `1px solid ${p.outlineVariant}`,
          background: p.surfaceContainerLow,
          flex: "0 0 auto",
        }}
      >
        <span
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            display: "grid",
            placeItems: "center",
            background: p.secondaryContainer,
            color: p.onSecondaryContainer,
            flex: "0 0 auto",
          }}
        >
          <Icon name="account_tree" size={26} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 760, lineHeight: 1.2 }}>{copy.title}</div>
          <div style={{ marginTop: 3, fontSize: 12, color: p.onSurfaceVariant, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {copy.subtitle}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ padding: "6px 10px", borderRadius: 14, background: p.surfaceContainerHigh, color: p.onSurfaceVariant, fontSize: 12, fontWeight: 700 }}>
            {copy.screens} {graph.nodes.length}
          </span>
          <span style={{ padding: "6px 10px", borderRadius: 14, background: p.surfaceContainerHigh, color: p.onSurfaceVariant, fontSize: 12, fontWeight: 700 }}>
            {copy.routes} {validEdges.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            title={copy.close}
            className="m3-press"
            style={{ width: 44, height: 44, border: "none", borderRadius: 22, background: "transparent", color: p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer" }}
          >
            <Icon name="close" size={24} />
          </button>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", overscrollBehavior: "contain" }}>
        {!layout.nodes.length ? (
          <div style={{ minHeight: "100%", display: "grid", placeItems: "center", color: p.onSurfaceVariant, fontSize: 15 }}>{copy.empty}</div>
        ) : (
          <div style={{ position: "relative", width: Math.max(layout.width, 720), height: Math.max(layout.height, 420), minWidth: "100%", minHeight: "100%" }}>
            <svg
              aria-hidden="true"
              width={Math.max(layout.width, 720)}
              height={Math.max(layout.height, 420)}
              viewBox={`0 0 ${Math.max(layout.width, 720)} ${Math.max(layout.height, 420)}`}
              preserveAspectRatio="xMinYMin meet"
              style={{ position: "absolute", inset: 0, overflow: "visible" }}
            >
              <defs>
                <marker id="navigation-graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill={p.onSurfaceVariant} />
                </marker>
                <marker id="navigation-graph-arrow-selected" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill={p.primary} />
                </marker>
              </defs>
              {validEdges.map((edge) => {
                const from = nodeById.get(edge.fromFrameId);
                const to = nodeById.get(edge.toFrameId);
                if (!from || !to) return null;
                const pairKey = `${edge.fromFrameId}\u0000${edge.toFrameId}`;
                const index = pairIndex.get(pairKey) ?? 0;
                pairIndex.set(pairKey, index + 1);
                const offset = index === 0 ? 0 : (Math.ceil(index / 2) * 12) * (index % 2 ? 1 : -1);
                const path = edgePath(from, to, layout.nodeWidth, layout.nodeHeight, offset);
                const selected = edge.id === selectedEdgeId;
                return (
                  <g key={edge.id}>
                    <path
                      d={path}
                      fill="none"
                      stroke={selected ? p.primary : p.onSurfaceVariant}
                      strokeWidth={selected ? 3 : 2}
                      strokeDasharray={edgeStyle(edge)}
                      strokeLinecap="round"
                      opacity={selected ? 1 : 0.62}
                      markerEnd={selected ? "url(#navigation-graph-arrow-selected)" : "url(#navigation-graph-arrow)"}
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={18}
                      data-testid={`graph-edge-${edge.id}`}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onClick={() => setSelectedEdgeId(edge.id)}
                    />
                  </g>
                );
              })}
            </svg>

            {layout.nodes.map((node) => {
              const active = node.frameId === (selectedFrameId ?? graph.startFrameId);
              const reachable = graph.reachableFrameIds.includes(node.frameId);
              return (
                <div
                  key={node.frameId}
                  data-testid={`graph-node-${node.frameId}`}
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    width: layout.nodeWidth,
                    height: layout.nodeHeight,
                    borderRadius: 22,
                    border: `2px solid ${active ? p.primary : reachable ? p.outlineVariant : p.error}`,
                    background: active ? p.secondaryContainer : p.surfaceContainerHigh,
                    color: active ? p.onSecondaryContainer : p.onSurface,
                    boxShadow: "0 5px 18px rgba(0,0,0,0.10)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectFrame(node.frameId)}
                    className="m3-press"
                    style={{
                      width: "100%",
                      height: "100%",
                      padding: "13px 46px 12px 14px",
                      border: "none",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <span style={{ width: 25, height: 25, borderRadius: 9, display: "grid", placeItems: "center", background: active ? p.primary : p.surfaceContainerHighest, color: active ? p.onPrimary : p.onSurfaceVariant, fontSize: 11, fontWeight: 800, flex: "0 0 auto" }}>
                        {node.index + 1}
                      </span>
                      <strong style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>{node.label}</strong>
                    </div>
                    <div style={{ marginTop: 9, display: "flex", flexWrap: "wrap", gap: 5, color: active ? p.onSecondaryContainer : p.onSurfaceVariant, fontSize: 10, fontWeight: 700 }}>
                      <span>← {node.incoming}</span>
                      <span>→ {node.outgoing}</span>
                      {node.backActions > 0 && <span>↩ {copy.back} {node.backActions}</span>}
                      {node.frameId === graph.startFrameId && <span>{copy.start}</span>}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPreviewFrame(node.frameId);
                    }}
                    aria-label={`${copy.preview}: ${node.label}`}
                    title={copy.preview}
                    className="m3-press"
                    style={{ position: "absolute", right: 8, top: 8, width: 34, height: 34, border: "none", borderRadius: 17, background: active ? p.primary : p.surfaceContainerHighest, color: active ? p.onPrimary : p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer" }}
                  >
                    <Icon name="play_arrow" size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer
        style={{
          flex: "0 0 auto",
          borderTop: `1px solid ${p.outlineVariant}`,
          background: p.surfaceContainerLow,
          padding: "10px 14px max(10px, env(safe-area-inset-bottom))",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: p.onSurfaceVariant,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 20, borderTop: `2px solid ${p.onSurfaceVariant}` }} /> {copy.tap}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 20, borderTop: `2px dotted ${p.onSurfaceVariant}` }} /> {copy.slot}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 20, borderTop: `2px dashed ${p.onSurfaceVariant}` }} /> {copy.swipe}</span>
        <span style={{ marginLeft: 6, fontWeight: 800, color: graph.problems.length ? p.error : p.onSurfaceVariant }}>{copy.issues} {graph.problems.length}</span>
        {selectedEdge && (
          <div
            data-testid="graph-edge-editor"
            style={{
              flex: "1 1 420px",
              minWidth: 0,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px 6px 10px",
              borderRadius: 16,
              background: p.surfaceContainerHigh,
              color: p.onSurface,
            }}
          >
            <span style={{ flex: "1 1 220px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {labelById.get(selectedEdge.fromFrameId) ?? selectedEdge.fromFrameId} → {labelById.get(selectedEdge.toFrameId) ?? selectedEdge.toFrameId} · {selectedEdgeDescription}
            </span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
              {editCopy.destination}
              <select
                aria-label={editCopy.destination}
                value={selectedEdge.toFrameId}
                onChange={(event) => onEditEdge(selectedEdge, { to: event.target.value })}
                style={{
                  minHeight: 34,
                  maxWidth: 180,
                  borderRadius: 10,
                  border: `1px solid ${p.outlineVariant}`,
                  background: p.surface,
                  color: p.onSurface,
                  padding: "0 8px",
                }}
              >
                {selectedEdge.source !== "swipe" && <option value={BACK_TARGET}>{editCopy.back}</option>}
                {graph.nodes.map((node) => (
                  <option key={node.frameId} value={node.frameId}>{node.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => onEditEdge(selectedEdge, { remove: true })}
              aria-label={editCopy.remove}
              className="m3-press"
              style={{
                minHeight: 34,
                border: "none",
                borderRadius: 17,
                padding: "0 12px",
                background: p.errorContainer,
                color: p.onErrorContainer,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {editCopy.remove}
            </button>
          </div>
        )}
        {!selectedEdge && graph.problems.length === 0 && <span>{copy.noIssues}</span>}
        {!selectedEdge && graph.problems.length > 0 && (
          <span title={graph.problems.map(problemText).join("\n")} style={{ flex: "1 1 260px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {problemText(graph.problems[0])}{graph.problems.length > 1 ? ` (+${graph.problems.length - 1})` : ""}
          </span>
        )}
      </footer>
    </div>
  );
}
