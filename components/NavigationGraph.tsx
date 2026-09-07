"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deriveNavigationGraph,
  layoutNavigationGraph,
  navigationProblemAction,
  type NavigationEdge,
  type NavigationLayoutNode,
  type NavigationProblem,
} from "@/lib/navigation-graph";
import { BACK_TARGET, TRANSITIONS, type Doc, type Palette, type Transition } from "@/lib/tokens";
import { availableNavigationRouteTriggers, type NavigationEdgePatch, type NavigationRouteTrigger } from "@/lib/navigation-graph-edit";
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
  onLocateEdge,
  onCreateRoute,
  onClose,
}: {
  doc: Doc;
  widths: Record<string, number>;
  palette: Palette;
  selectedFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onPreviewFrame: (id: string) => void;
  onEditEdge: (edge: NavigationEdge, patch: NavigationEdgePatch) => void;
  onLocateEdge: (edge: NavigationEdge) => void;
  onCreateRoute: (sourceFrameId: string, targetFrameId: string, trigger: NavigationRouteTrigger, transition?: Transition) => void;
  onClose: () => void;
}) {
  const lang = useLang();
  const copy = COPY[lang];
  const editCopy = {
    destination: lang === "ja" ? "移動先" : lang === "zh" ? "目标画面" : lang === "ko" ? "대상 화면" : "Destination",
    remove: lang === "ja" ? "この遷移を削除" : lang === "zh" ? "删除此跳转" : lang === "ko" ? "이 이동 삭제" : "Remove route",
    back: lang === "ja" ? "戻る" : lang === "zh" ? "返回" : lang === "ko" ? "뒤로" : "Back",
    transition: lang === "ja" ? "トランジション" : lang === "zh" ? "过渡效果" : lang === "ko" ? "전환 효과" : "Transition",
    locate: lang === "ja" ? "元の部品を編集" : lang === "zh" ? "编辑来源组件" : lang === "ko" ? "원본 항목 편집" : "Edit source",
  };
  const graph = useMemo(
    () => deriveNavigationGraph(doc, widths, selectedFrameId),
    [doc, widths, selectedFrameId],
  );
  const layout = useMemo(() => layoutNavigationGraph(graph), [graph]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [routeDrag, setRouteDrag] = useState<{ sourceFrameId: string; x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [pendingRoute, setPendingRoute] = useState<{ sourceFrameId: string; targetFrameId: string } | null>(null);
  const [pendingTrigger, setPendingTrigger] = useState<NavigationRouteTrigger | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  useEffect(() => {
    if (!routeDrag) return;
    const sourceFrameId = routeDrag.sourceFrameId;
    const move = (event: PointerEvent) => {
      setRouteDrag((current) => current
        ? { ...current, x1: event.clientX, y1: event.clientY }
        : current);
    };
    const up = (event: PointerEvent) => {
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-graph-frame-id]"))
        .find((element) => {
          const rect = element.getBoundingClientRect();
          return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        })?.dataset.graphFrameId;
      if (target) {
        setPendingTrigger(null);
        setPendingRoute({ sourceFrameId, targetFrameId: target });
      }
      setRouteDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [routeDrag?.sourceFrameId]);
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
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const matchingFrameIds = new Set(
    graph.nodes
      .filter((node) => !normalizedSearch || node.label.toLocaleLowerCase().includes(normalizedSearch))
      .map((node) => node.frameId),
  );
  const pairIndex = new Map<string, number>();
  const pendingTriggers = pendingRoute
    ? availableNavigationRouteTriggers(doc, widths, pendingRoute.sourceFrameId)
    : [];
  const routeCopy = {
    create: lang === "ja" ? "新しい遷移" : lang === "zh" ? "新建跳转" : lang === "ko" ? "새 이동" : "New route",
    hint: lang === "ja" ? "丸い接続点を別の画面へドラッグ" : lang === "zh" ? "将连接点拖到另一个画面" : lang === "ko" ? "연결점을 다른 화면으로 드래그" : "Drag a connector to another screen",
    choose: lang === "ja" ? "何をトリガーにしますか？" : lang === "zh" ? "选择触发方式" : lang === "ko" ? "트리거를 선택하세요" : "Choose a trigger",
    cancel: lang === "ja" ? "キャンセル" : lang === "zh" ? "取消" : lang === "ko" ? "취소" : "Cancel",
    item: lang === "ja" ? "タップ" : lang === "zh" ? "点击" : lang === "ko" ? "탭" : "Tap",
    slot: lang === "ja" ? "項目" : lang === "zh" ? "项目" : lang === "ko" ? "항목" : "Slot",
    swipe: lang === "ja" ? "スワイプ" : lang === "zh" ? "滑动" : lang === "ko" ? "스와이프" : "Swipe",
    button: lang === "ja" ? "新しいボタンを追加" : lang === "zh" ? "添加新按钮" : lang === "ko" ? "새 버튼 추가" : "Add a new button",
    transition: lang === "ja" ? "画面切り替え" : lang === "zh" ? "画面过渡" : lang === "ko" ? "화면 전환" : "Screen transition",
    search: lang === "ja" ? "画面を検索" : lang === "zh" ? "搜索画面" : lang === "ko" ? "화면 검색" : "Search screens",
    noMatch: lang === "ja" ? "一致する画面はありません" : lang === "zh" ? "没有匹配的画面" : lang === "ko" ? "일치하는 화면이 없습니다" : "No matching screens",
    backToTrigger: lang === "ja" ? "トリガー選択に戻る" : lang === "zh" ? "返回触发方式" : lang === "ko" ? "트리거 선택으로 돌아가기" : "Back to trigger",
  };
  const triggerLabel = (trigger: NavigationRouteTrigger) => {
    if (trigger.kind === "item") return `${routeCopy.item}: ${trigger.label}`;
    if (trigger.kind === "slot") return `${routeCopy.slot}: ${trigger.label}`;
    if (trigger.kind === "swipe") return `${routeCopy.swipe}: ${trigger.label}`;
    return routeCopy.button;
  };

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

  const activateProblem = (problem: NavigationProblem) => {
    const action = navigationProblemAction(problem);
    setDiagnosticsOpen(false);
    setSearchQuery("");
    if (action.kind === "focus-frame") {
      onSelectFrame(action.frameId);
      return;
    }
    const edge = graph.edges.find((candidate) => candidate.id === action.edgeId);
    if (!edge) return;
    if (action.kind === "locate-edge") {
      onLocateEdge(edge);
      return;
    }
    setSelectedEdgeId(edge.id);
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

      <div
        style={{
          flex: "0 0 auto",
          minHeight: 52,
          padding: "7px 14px",
          borderBottom: `1px solid ${p.outlineVariant}`,
          background: p.surface,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon name="search" size={20} />
        <input
          type="search"
          data-testid="graph-screen-search"
          aria-label={routeCopy.search}
          placeholder={routeCopy.search}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 38,
            border: `1px solid ${p.outlineVariant}`,
            borderRadius: 19,
            background: p.surfaceContainerLow,
            color: p.onSurface,
            padding: "0 14px",
            outline: "none",
            font: "inherit",
          }}
        />
        {normalizedSearch && (
          <span data-testid="graph-search-count" style={{ minWidth: 46, textAlign: "right", color: matchingFrameIds.size ? p.onSurfaceVariant : p.error, fontSize: 12, fontWeight: 800 }}>
            {matchingFrameIds.size}/{graph.nodes.length}
          </span>
        )}
      </div>

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

            {normalizedSearch && matchingFrameIds.size === 0 && (
              <div
                data-testid="graph-search-empty"
                style={{ position: "absolute", left: 20, top: 18, zIndex: 5, padding: "8px 12px", borderRadius: 14, background: p.errorContainer, color: p.onErrorContainer, fontSize: 12, fontWeight: 800 }}
              >
                {routeCopy.noMatch}
              </div>
            )}
            {layout.nodes.map((node) => {
              const active = node.frameId === (selectedFrameId ?? graph.startFrameId);
              const reachable = graph.reachableFrameIds.includes(node.frameId);
              const searchMatch = matchingFrameIds.has(node.frameId);
              return (
                <div
                  key={node.frameId}
                  data-testid={`graph-node-${node.frameId}`}
                  data-graph-frame-id={node.frameId}
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
                    opacity: normalizedSearch && !searchMatch ? 0.24 : 1,
                    transition: "opacity 120ms ease",
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
                  <button
                    type="button"
                    data-testid={`graph-connect-${node.frameId}`}
                    aria-label={`${routeCopy.create}: ${node.label}`}
                    title={routeCopy.hint}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setSelectedEdgeId(null);
                      setRouteDrag({ sourceFrameId: node.frameId, x0: event.clientX, y0: event.clientY, x1: event.clientX, y1: event.clientY });
                    }}
                    className="m3-press"
                    style={{ position: "absolute", right: 4, top: "50%", marginTop: -11, width: 22, height: 22, borderRadius: 11, border: `3px solid ${p.surface}`, background: p.primary, cursor: "crosshair", zIndex: 3, touchAction: "none" }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {routeDrag && (
        <svg aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 110, pointerEvents: "none" }}>
          <line x1={routeDrag.x0} y1={routeDrag.y0} x2={routeDrag.x1} y2={routeDrag.y1} stroke={p.primary} strokeWidth={4} strokeLinecap="round" strokeDasharray="8 6" />
        </svg>
      )}
      {pendingRoute && (
        <div data-testid={pendingTrigger ? "graph-route-transition-chooser" : "graph-route-trigger-chooser"} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.28)", display: "grid", placeItems: "end center", padding: "16px max(12px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))" }}>
          <div role="dialog" aria-label={pendingTrigger ? routeCopy.transition : routeCopy.choose} style={{ width: "min(560px, 100%)", maxHeight: "70vh", overflow: "auto", borderRadius: 26, padding: 16, background: p.surfaceContainerHigh, color: p.onSurface, boxShadow: "0 18px 50px rgba(0,0,0,.24)" }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{pendingTrigger ? routeCopy.transition : routeCopy.choose}</div>
            <div style={{ marginTop: 5, fontSize: 12, color: p.onSurfaceVariant }}>{labelById.get(pendingRoute.sourceFrameId) ?? pendingRoute.sourceFrameId} → {labelById.get(pendingRoute.targetFrameId) ?? pendingRoute.targetFrameId}{pendingTrigger ? ` · ${triggerLabel(pendingTrigger)}` : ""}</div>
            {!pendingTrigger ? (
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                {pendingTriggers.map((trigger, index) => (
                  <button
                    type="button"
                    key={`${trigger.kind}-${"itemId" in trigger ? trigger.itemId : "swipe" in trigger ? trigger.swipe : "new"}-${"slot" in trigger ? trigger.slot : index}`}
                    onClick={() => {
                      if (trigger.kind === "swipe") {
                        onCreateRoute(pendingRoute.sourceFrameId, pendingRoute.targetFrameId, trigger);
                        setPendingRoute(null);
                      } else {
                        setPendingTrigger(trigger);
                      }
                    }}
                    className="m3-press"
                    style={{ minHeight: 48, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, padding: "0 14px", background: p.surface, color: p.onSurface, textAlign: "left", fontWeight: 750, cursor: "pointer" }}
                  >
                    {triggerLabel(trigger)}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 14 }}>
                {TRANSITIONS.map((transition) => (
                  <button
                    type="button"
                    key={transition.key}
                    onClick={() => {
                      onCreateRoute(pendingRoute.sourceFrameId, pendingRoute.targetFrameId, pendingTrigger, transition.key);
                      setPendingTrigger(null);
                      setPendingRoute(null);
                    }}
                    className="m3-press"
                    style={{ minHeight: 48, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, padding: "0 14px", background: p.surface, color: p.onSurface, textAlign: "left", fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Icon name={transition.icon} size={20} />
                    {transition.label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => pendingTrigger ? setPendingTrigger(null) : setPendingRoute(null)} style={{ marginTop: 12, minHeight: 44, border: "none", borderRadius: 22, padding: "0 16px", background: "transparent", color: p.primary, fontWeight: 800, cursor: "pointer" }}>{pendingTrigger ? routeCopy.backToTrigger : routeCopy.cancel}</button>
          </div>
        </div>
      )}

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
        <button
          type="button"
          data-testid="graph-problems-toggle"
          aria-expanded={diagnosticsOpen}
          onClick={() => graph.problems.length && setDiagnosticsOpen((open) => !open)}
          disabled={graph.problems.length === 0}
          className="m3-press"
          style={{
            marginLeft: 6,
            minHeight: 32,
            border: "none",
            borderRadius: 16,
            padding: "0 10px",
            background: graph.problems.length ? p.errorContainer : "transparent",
            color: graph.problems.length ? p.onErrorContainer : p.onSurfaceVariant,
            fontWeight: 800,
            cursor: graph.problems.length ? "pointer" : "default",
          }}
        >
          {copy.issues} {graph.problems.length}
        </button>
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
            <button
              type="button"
              onClick={() => onLocateEdge(selectedEdge)}
              aria-label={editCopy.locate}
              className="m3-press"
              style={{
                minHeight: 34,
                border: `1px solid ${p.outlineVariant}`,
                borderRadius: 17,
                padding: "0 12px",
                background: p.surface,
                color: p.primary,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="my_location" size={18} />
              {editCopy.locate}
            </button>
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
            {selectedEdge.source !== "swipe" && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                {editCopy.transition}
                <select
                  aria-label={editCopy.transition}
                  value={selectedEdge.transition ?? "slide"}
                  onChange={(event) => onEditEdge(selectedEdge, { transition: event.target.value as Transition })}
                  style={{ minHeight: 34, maxWidth: 180, borderRadius: 10, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 8px" }}
                >
                  {TRANSITIONS.map((transition) => (
                    <option key={transition.key} value={transition.key}>{transition.label}</option>
                  ))}
                </select>
              </label>
            )}
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
        {!selectedEdge && !diagnosticsOpen && graph.problems.length === 0 && <span>{copy.noIssues}</span>}
        {!selectedEdge && !diagnosticsOpen && graph.problems.length > 0 && (
          <span title={graph.problems.map(problemText).join("\n")} style={{ flex: "1 1 260px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {problemText(graph.problems[0])}{graph.problems.length > 1 ? ` (+${graph.problems.length - 1})` : ""}
          </span>
        )}
        {diagnosticsOpen && graph.problems.length > 0 && (
          <div
            data-testid="graph-problems-panel"
            style={{
              flex: "1 0 100%",
              display: "grid",
              gap: 6,
              paddingTop: 4,
            }}
          >
            {graph.problems.map((problem, index) => (
              <button
                key={`${problem.kind}-${index}`}
                type="button"
                data-testid={`graph-problem-${problem.kind}-${index}`}
                onClick={() => activateProblem(problem)}
                className="m3-press"
                style={{
                  width: "100%",
                  minHeight: 40,
                  border: `1px solid ${p.outlineVariant}`,
                  borderRadius: 14,
                  padding: "8px 12px",
                  background: p.surface,
                  color: p.onSurface,
                  textAlign: "left",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {problemText(problem)}
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
