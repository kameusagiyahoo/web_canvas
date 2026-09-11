"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  ArchitectureApiNode,
  ArchitectureEndpoint,
  ArchitectureFlow,
  ArchitectureHttpMethod,
  Frame,
  Palette,
} from "@/lib/tokens";
import {
  architectureEndpointKey,
  architectureEndpointOptions,
  diagnoseArchitectureFlow,
  layoutArchitectureGraph,
} from "@/lib/architecture-flow";
import { useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";

const parseEndpoint = (value: string): ArchitectureEndpoint | null => {
  const colon = value.indexOf(":");
  if (colon <= 0) return null;
  const kind = value.slice(0, colon);
  const id = value.slice(colon + 1);
  if (!id || (kind !== "frame" && kind !== "action" && kind !== "api")) return null;
  return { kind, id } as ArchitectureEndpoint;
};

const endpointTestId = (endpoint: ArchitectureEndpoint) =>
  `architecture-graph-node-${endpoint.kind}-${endpoint.id}`;

export function ArchitectureFlowView({
  flow,
  frames,
  palette: p,
  onClose,
  onAddAction,
  onRenameAction,
  onDeleteAction,
  onAddApi,
  onUpdateApi,
  onDeleteApi,
  onConnect,
  onDeleteEdge,
}: {
  flow: ArchitectureFlow;
  frames: Frame[];
  palette: Palette;
  onClose: () => void;
  onAddAction: (name: string) => void;
  onRenameAction: (id: string, name: string) => void;
  onDeleteAction: (id: string) => void;
  onAddApi: (name: string, method: ArchitectureHttpMethod, path: string) => void;
  onUpdateApi: (id: string, patch: Partial<Pick<ArchitectureApiNode, "name" | "method" | "path">>) => void;
  onDeleteApi: (id: string) => void;
  onConnect: (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) => void;
  onDeleteEdge: (id: string) => void;
}) {
  const lang = useLang();
  const copy = {
    title: lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture",
    subtitle: lang === "ja" ? "Screen・Action・APIの意味上の流れを可視化します" : lang === "zh" ? "可视化 Screen、Action 与 API 的语义流程" : lang === "ko" ? "Screen, Action, API의 의미 흐름을 시각화합니다" : "Visualize the semantic flow between Screens, Actions, and APIs",
    visual: lang === "ja" ? "フロー図" : lang === "zh" ? "流程图" : lang === "ko" ? "흐름도" : "Flow graph",
    graphHint: lang === "ja" ? "位置は自動配置です。ノード位置はプロジェクトには保存しません。" : "Layout is automatic and node positions are not stored in the project.",
    connectMode: lang === "ja" ? "グラフ上で接続" : "Connect on graph",
    endConnectMode: lang === "ja" ? "接続モードを終了" : "Exit connect mode",
    pickSource: lang === "ja" ? "開始ノードを選択してください" : "Choose a source node",
    pickTarget: lang === "ja" ? "接続先ノードを選択してください" : "Choose a target node",
    selectedLink: lang === "ja" ? "選択した接続" : "Selected link",
    deleteLink: lang === "ja" ? "接続を削除" : "Delete link",
    diagnostics: lang === "ja" ? "診断" : "Diagnostics",
    diagnosticsHint: lang === "ja" ? "Action/APIの接続漏れ・API重複・循環・削除済みノードを参照する壊れた接続を検出します。" : "Detect Action/API connectivity problems, duplicate API endpoints, cycles, and links that reference deleted endpoints.",
    diagnosticsOk: lang === "ja" ? "Architecture Flowに問題は見つかりませんでした" : "No Architecture Flow problems found",
    screens: lang === "ja" ? "画面" : lang === "zh" ? "屏幕" : lang === "ko" ? "화면" : "Screens",
    actions: "Actions",
    apis: "APIs",
    links: lang === "ja" ? "意味上の接続" : lang === "zh" ? "语义连接" : lang === "ko" ? "의미 연결" : "Semantic links",
    addAction: lang === "ja" ? "Actionを追加" : lang === "zh" ? "添加Action" : lang === "ko" ? "Action 추가" : "Add Action",
    actionName: lang === "ja" ? "処理名（例: ログインを検証）" : "Action name (e.g. Validate login)",
    addApi: lang === "ja" ? "APIを追加" : "Add API",
    apiName: lang === "ja" ? "API名（例: ログインAPI）" : "API name (e.g. Login API)",
    apiPath: lang === "ja" ? "パス（例: /api/login）" : "Path (e.g. /api/login)",
    editApi: lang === "ja" ? "APIを編集" : "Edit API",
    deleteApi: lang === "ja" ? "APIを削除" : "Delete API",
    rename: lang === "ja" ? "Action名を変更" : "Rename Action",
    deleteAction: lang === "ja" ? "Actionを削除" : "Delete Action",
    source: lang === "ja" ? "開始" : "From",
    target: lang === "ja" ? "接続先" : "To",
    label: lang === "ja" ? "ラベル（任意）" : "Label (optional)",
    addLink: lang === "ja" ? "接続を追加" : "Add link",
    none: lang === "ja" ? "まだありません" : "None yet",
    close: lang === "ja" ? "閉じる" : lang === "zh" ? "关闭" : lang === "ko" ? "닫기" : "Close",
    confirmDelete: lang === "ja" ? "このActionと接続を削除しますか？" : "Delete this Action and its links?",
    confirmDeleteApi: lang === "ja" ? "このAPIと接続を削除しますか？" : "Delete this API and its links?",
    screenBadge: "Screen",
    actionBadge: "Action",
    apiBadge: "API",
  };
  const [actionName, setActionName] = useState("");
  const [apiName, setApiName] = useState("");
  const [apiMethod, setApiMethod] = useState<ArchitectureHttpMethod>("GET");
  const [apiPath, setApiPath] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [label, setLabel] = useState("");
  const [connectMode, setConnectMode] = useState(false);
  const [graphSource, setGraphSource] = useState<ArchitectureEndpoint | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [highlightedEndpointKey, setHighlightedEndpointKey] = useState<string | null>(null);

  const options = useMemo(() => architectureEndpointOptions(frames, flow), [frames, flow]);
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((option) => map.set(architectureEndpointKey(option.endpoint), option.label));
    return map;
  }, [options]);
  const layout = useMemo(() => layoutArchitectureGraph(frames, flow), [frames, flow]);
  const graphNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.key, node])), [layout.nodes]);
  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const actionNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "action"), [flow.nodes]);
  const apiNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "api"), [flow.nodes]);
  const diagnostics = useMemo(() => diagnoseArchitectureFlow(frames, flow), [frames, flow]);
  const diagnosticsByKey = useMemo(() => {
    const map = new Map<string, typeof diagnostics>();
    diagnostics.forEach((diagnostic) => {
      const key = architectureEndpointKey(diagnostic.endpoint);
      map.set(key, [...(map.get(key) ?? []), diagnostic]);
    });
    return map;
  }, [diagnostics]);

  useEffect(() => {
    if (selectedEdgeId && !flow.edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [flow.edges, selectedEdgeId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (connectMode || selectedEdgeId) {
          setConnectMode(false);
          setGraphSource(null);
          setSelectedEdgeId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [connectMode, onClose, selectedEdgeId]);

  const addAction = () => {
    const name = actionName.trim();
    if (!name) return;
    onAddAction(name);
    setActionName("");
  };

  const addApi = () => {
    const name = apiName.trim();
    const path = apiPath.trim();
    if (!name || !path) return;
    onAddApi(name, apiMethod, path);
    setApiName("");
    setApiPath("");
  };

  const addLink = () => {
    const source = parseEndpoint(from);
    const target = parseEndpoint(to);
    if (!source || !target) return;
    onConnect(source, target, label);
    setLabel("");
  };

  const clickGraphNode = (endpoint: ArchitectureEndpoint) => {
    setHighlightedEndpointKey(null);
    if (!connectMode) return;
    if (!graphSource) {
      setGraphSource(endpoint);
      setSelectedEdgeId(null);
      return;
    }
    const sourceKey = architectureEndpointKey(graphSource);
    const targetKey = architectureEndpointKey(endpoint);
    const duplicate = flow.edges.some(
      (edge) => architectureEndpointKey(edge.from) === sourceKey && architectureEndpointKey(edge.to) === targetKey,
    );
    if (sourceKey !== targetKey && !duplicate) onConnect(graphSource, endpoint, "");
    setGraphSource(null);
  };

  const diagnosticMessage = (kind: string, name: string, missingName?: string) => {
    if (lang === "ja") {
      if (kind === "isolated-action") return `どこにも接続されていないAction: ${name}`;
      if (kind === "isolated-api") return `どこにも接続されていないAPI: ${name}`;
      if (kind === "duplicate-api-endpoint") return `同じメソッドとパスのAPIが複数あります: ${name}`;
      if (kind === "no-incoming-action") return `入口がないAction: ${name}`;
      if (kind === "no-outgoing-action") return `出口がないAction: ${name}`;
      if (kind === "missing-source-endpoint") return `接続元が見つからないリンク: ${missingName ?? name}`;
      if (kind === "missing-target-endpoint") return `接続先が見つからないリンク: ${missingName ?? name}`;
      return `循環しているノード: ${name}`;
    }
    if (kind === "isolated-action") return `Action is not connected: ${name}`;
    if (kind === "isolated-api") return `API is not connected: ${name}`;
    if (kind === "duplicate-api-endpoint") return `Duplicate API method/path: ${name}`;
    if (kind === "no-incoming-action") return `Action has no incoming flow: ${name}`;
    if (kind === "no-outgoing-action") return `Action has no outgoing flow: ${name}`;
    if (kind === "missing-source-endpoint") return `Link source is missing: ${missingName ?? name}`;
    if (kind === "missing-target-endpoint") return `Link target is missing: ${missingName ?? name}`;
    return `Node participates in a cycle: ${name}`;
  };

  const focusDiagnostic = (diagnostic: (typeof diagnostics)[number]) => {
    const endpoint = diagnostic.endpoint;
    const key = architectureEndpointKey(endpoint);
    const hasFocusableNode = graphNodes.has(key);
    setHighlightedEndpointKey(hasFocusableNode ? key : null);
    setConnectMode(false);
    setGraphSource(null);
    setSelectedEdgeId(diagnostic.edgeId ?? null);
    requestAnimationFrame(() => {
      const element = hasFocusableNode
        ? document.querySelector(`[data-testid="${endpointTestId(endpoint)}"]`) as HTMLElement | null
        : document.querySelector('[data-testid="architecture-graph-edge-editor"]') as HTMLElement | null;
      element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      element?.focus({ preventScroll: true });
    });
  };

  const graphPath = (edge: ArchitectureFlow["edges"][number]) => {
    const source = graphNodes.get(architectureEndpointKey(edge.from));
    const target = graphNodes.get(architectureEndpointKey(edge.to));
    if (!source || !target) return null;
    const sx = source.x + source.w;
    const sy = source.y + source.h / 2;
    const tx = target.x;
    const ty = target.y + target.h / 2;
    if (tx > sx + 20) {
      const curve = Math.max(42, (tx - sx) * 0.48);
      return `M ${sx} ${sy} C ${sx + curve} ${sy}, ${tx - curve} ${ty}, ${tx} ${ty}`;
    }
    const lift = Math.max(72, Math.abs(sy - ty) * 0.45 + 56);
    return `M ${sx} ${sy} C ${sx + 72} ${sy - lift}, ${tx - 72} ${ty - lift}, ${tx} ${ty}`;
  };

  const card = (background: string, color: string): CSSProperties => ({
    borderRadius: 18,
    padding: 14,
    background,
    color,
    border: `1px solid ${p.outlineVariant}`,
  });

  const sourceLabel = graphSource ? labels.get(architectureEndpointKey(graphSource)) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      data-testid="architecture-flow"
      style={{ position: "fixed", inset: 0, zIndex: 150, background: p.surface, color: p.onSurface, display: "flex", flexDirection: "column" }}
    >
      <header style={{ padding: "max(14px, env(safe-area-inset-top)) 16px 12px", borderBottom: `1px solid ${p.outlineVariant}`, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 15, display: "grid", placeItems: "center", background: p.tertiaryContainer, color: p.onTertiaryContainer }}>
          <Icon name="schema" size={26} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 850 }}>{copy.title}</div>
          <div style={{ marginTop: 2, fontSize: 12, color: p.onSurfaceVariant }}>{copy.subtitle}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={copy.close} className="m3-press" style={{ width: 44, height: 44, border: "none", borderRadius: 22, background: "transparent", color: p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer" }}>
          <Icon name="close" size={24} />
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 16 }}>
        <div style={{ width: "min(1180px, 100%)", margin: "0 auto", display: "grid", gap: 18 }}>
          <section data-testid="architecture-graph" style={{ border: `1px solid ${p.outlineVariant}`, borderRadius: 24, overflow: "hidden", background: p.surfaceContainerLow }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${p.outlineVariant}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900 }}>{copy.visual}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: p.onSurfaceVariant }}>{copy.graphHint}</div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 12, color: p.onSurfaceVariant }}>{layout.nodes.length} nodes · {flow.edges.length} links</span>
              <button
                type="button"
                data-testid="architecture-connect-mode"
                onClick={() => {
                  setConnectMode((current) => !current);
                  setGraphSource(null);
                  setSelectedEdgeId(null);
                }}
                className="m3-press"
                style={{ minHeight: 38, border: "none", borderRadius: 19, padding: "0 13px", background: connectMode ? p.primary : p.secondaryContainer, color: connectMode ? p.onPrimary : p.onSecondaryContainer, fontWeight: 800, cursor: "pointer" }}
              >
                {connectMode ? copy.endConnectMode : copy.connectMode}
              </button>
            </div>

            {(connectMode || selectedEdge) && (
              <div data-testid={selectedEdge ? "architecture-graph-edge-editor" : "architecture-connect-status"} style={{ minHeight: 44, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${p.outlineVariant}`, background: p.surface }}>
                {selectedEdge ? (
                  <>
                    <Icon name="link" size={19} />
                    <span style={{ fontSize: 12, fontWeight: 800 }}>{copy.selectedLink}: {labels.get(architectureEndpointKey(selectedEdge.from)) ?? architectureEndpointKey(selectedEdge.from)} → {labels.get(architectureEndpointKey(selectedEdge.to)) ?? architectureEndpointKey(selectedEdge.to)}</span>
                    <button type="button" onClick={() => { onDeleteEdge(selectedEdge.id); setSelectedEdgeId(null); }} className="m3-press" style={{ marginLeft: "auto", minHeight: 34, border: "none", borderRadius: 17, padding: "0 11px", background: p.errorContainer, color: p.onErrorContainer, fontWeight: 800, cursor: "pointer" }}>{copy.deleteLink}</button>
                  </>
                ) : (
                  <>
                    <Icon name={graphSource ? "arrow_forward" : "touch_app"} size={19} />
                    <span style={{ fontSize: 12, fontWeight: 750, color: p.onSurfaceVariant }}>{graphSource ? `${copy.pickTarget} · ${sourceLabel ?? architectureEndpointKey(graphSource)}` : copy.pickSource}</span>
                  </>
                )}
              </div>
            )}

            <div style={{ overflow: "auto", overscrollBehavior: "contain", maxHeight: "min(58vh, 620px)" }}>
              <div style={{ position: "relative", width: layout.width, height: layout.height, minWidth: "100%", minHeight: 260 }}>
                <svg width={layout.width} height={layout.height} aria-hidden style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                  <defs>
                    <marker id="architecture-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                      <path d="M 0 0 L 8 4 L 0 8 z" fill={p.outline} />
                    </marker>
                  </defs>
                  {flow.edges.map((edge) => {
                    const d = graphPath(edge);
                    if (!d) return null;
                    const selected = edge.id === selectedEdgeId;
                    return (
                      <g key={edge.id}>
                        <path d={d} fill="none" stroke={selected ? p.primary : p.outline} strokeWidth={selected ? 3 : 2} markerEnd="url(#architecture-arrow)" />
                        <path
                          d={d}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={18}
                          data-testid={`architecture-graph-link-${edge.id}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${copy.selectedLink}: ${labels.get(architectureEndpointKey(edge.from)) ?? edge.from.id} → ${labels.get(architectureEndpointKey(edge.to)) ?? edge.to.id}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => { setSelectedEdgeId(edge.id); setConnectMode(false); setGraphSource(null); }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedEdgeId(edge.id);
                              setConnectMode(false);
                              setGraphSource(null);
                            }
                          }}
                        />
                      </g>
                    );
                  })}
                </svg>

                {layout.nodes.map((node) => {
                  const source = graphSource && architectureEndpointKey(graphSource) === node.key;
                  const action = node.endpoint.kind === "action";
                  const api = node.endpoint.kind === "api";
                  const nodeDiagnostics = diagnosticsByKey.get(node.key) ?? [];
                  const highlighted = highlightedEndpointKey === node.key;
                  const diagnosticColor = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.error : p.primary;
                  const diagnosticBorder = highlighted || nodeDiagnostics.length > 0;
                  return (
                    <button
                      key={node.key}
                      type="button"
                      data-testid={endpointTestId(node.endpoint)}
                      aria-pressed={source || undefined}
                      aria-disabled={!connectMode}
                      onClick={() => clickGraphNode(node.endpoint)}
                      className="m3-press"
                      style={{
                        position: "absolute",
                        left: node.x,
                        top: node.y,
                        width: node.w,
                        height: node.h,
                        border: `${source || highlighted ? 3 : nodeDiagnostics.length ? 2 : 1}px solid ${source ? p.primary : diagnosticBorder ? diagnosticColor : p.outlineVariant}`,
                        borderRadius: 20,
                        padding: "11px 13px",
                        background: api ? p.tertiaryContainer : action ? p.secondaryContainer : p.surface,
                        color: api ? p.onTertiaryContainer : action ? p.onSecondaryContainer : p.onSurface,
                        boxShadow: source ? `0 0 0 4px ${p.primaryContainer}` : highlighted ? `0 0 0 4px ${nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.errorContainer : p.primaryContainer}` : "0 4px 12px rgba(0,0,0,0.08)",
                        textAlign: "left",
                        cursor: connectMode ? "crosshair" : "default",
                        overflow: "hidden",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 900, color: action ? p.primary : api ? p.onTertiaryContainer : p.onSurfaceVariant }}>
                        <Icon name={action ? "bolt" : api ? "api" : "web_asset"} size={16} />
                        {action ? copy.actionBadge : api ? copy.apiBadge : copy.screenBadge}
                        {nodeDiagnostics.length > 0 && (
                          <span aria-label={`${copy.diagnostics}: ${nodeDiagnostics.length}`} style={{ marginLeft: "auto", minWidth: 19, height: 19, padding: "0 5px", borderRadius: 10, display: "grid", placeItems: "center", background: nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.errorContainer : p.primaryContainer, color: nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.onErrorContainer : p.onPrimaryContainer, fontSize: 10, fontWeight: 900 }}>
                            {nodeDiagnostics.length}
                          </span>
                        )}
                      </span>
                      <span style={{ display: "block", marginTop: 6, fontSize: 14, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section data-testid="architecture-diagnostics" style={{ border: `1px solid ${p.outlineVariant}`, borderRadius: 20, padding: 14, background: p.surfaceContainerLow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={diagnostics.length ? "warning" : "check_circle"} size={21} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 900 }}>{copy.diagnostics}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: p.onSurfaceVariant }}>{copy.diagnosticsHint}</div>
              </div>
              <span data-testid="architecture-diagnostic-count" style={{ marginLeft: "auto", minWidth: 28, height: 28, borderRadius: 14, display: "grid", placeItems: "center", background: diagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.errorContainer : p.surfaceContainer, color: diagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.onErrorContainer : p.onSurfaceVariant, fontWeight: 900, fontSize: 12 }}>
                {diagnostics.length}
              </span>
            </div>
            {diagnostics.length ? (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {diagnostics.map((diagnostic) => {
                  const key = architectureEndpointKey(diagnostic.endpoint);
                  const name = labels.get(key) ?? diagnostic.endpoint.id;
                  const missingName = diagnostic.missingEndpoint
                    ? labels.get(architectureEndpointKey(diagnostic.missingEndpoint)) ?? architectureEndpointKey(diagnostic.missingEndpoint)
                    : undefined;
                  const message = diagnosticMessage(diagnostic.kind, name, missingName);
                  return (
                    <button
                      key={diagnostic.id}
                      type="button"
                      data-testid={`architecture-diagnostic-${diagnostic.id}`}
                      aria-label={message}
                      onClick={() => focusDiagnostic(diagnostic)}
                      className="m3-press"
                      style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${diagnostic.severity === "error" ? p.error : p.outlineVariant}`, background: diagnostic.severity === "error" ? p.errorContainer : p.surface, color: diagnostic.severity === "error" ? p.onErrorContainer : p.onSurface, padding: "8px 11px", display: "flex", alignItems: "center", gap: 9, textAlign: "left", cursor: "pointer" }}
                    >
                      <Icon name={diagnostic.kind === "cycle" ? "sync" : diagnostic.edgeId ? "link_off" : "warning"} size={18} />
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{message}</span>
                      <Icon name="my_location" size={17} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 12, color: p.onSurfaceVariant }}>{copy.diagnosticsOk}</div>
            )}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 850, color: p.onSurfaceVariant, marginBottom: 8 }}>{copy.screens}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {frames.map((frame) => (
                  <div key={frame.id} style={card(p.surfaceContainerLow, p.onSurface)}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: p.primary }}>{copy.screenBadge}</div>
                    <div style={{ marginTop: 4, fontWeight: 800 }}>{frame.name || copy.screens}</div>
                  </div>
                ))}
                {!frames.length && <div style={{ ...card(p.surfaceContainerLow, p.onSurfaceVariant), fontSize: 13 }}>{copy.none}</div>}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 850, color: p.onSurfaceVariant }}>{copy.actions}</div>
                <span style={{ marginLeft: "auto", fontSize: 12, color: p.onSurfaceVariant }}>{actionNodes.length}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={actionName} onChange={(event) => setActionName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addAction(); }} data-testid="architecture-action-name" aria-label={copy.actionName} placeholder={copy.actionName} style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }} />
                <button type="button" onClick={addAction} data-testid="architecture-add-action" className="m3-press" style={{ height: 44, border: "none", borderRadius: 22, padding: "0 14px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{copy.addAction}</button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {actionNodes.map((node) => (
                  <div key={node.id} data-testid={`architecture-action-${node.id}`} style={card(p.secondaryContainer, p.onSecondaryContainer)}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: p.primary }}>{copy.actionBadge}</div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</div>
                      <button type="button" onClick={() => { const next = window.prompt(copy.rename, node.name); if (next !== null) onRenameAction(node.id, next); }} aria-label={copy.rename} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>
                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDelete)) onDeleteAction(node.id); }} aria-label={copy.deleteAction} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>
                    </div>
                  </div>
                ))}
                {!actionNodes.length && <div style={{ ...card(p.surfaceContainerLow, p.onSurfaceVariant), fontSize: 13 }}>{copy.none}</div>}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 850, color: p.onSurfaceVariant }}>{copy.apis}</div>
                <span style={{ marginLeft: "auto", fontSize: 12, color: p.onSurfaceVariant }}>{apiNodes.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, marginBottom: 8 }}>
                <select value={apiMethod} onChange={(event) => setApiMethod(event.target.value as ArchitectureHttpMethod)} data-testid="architecture-api-method" aria-label="HTTP method" style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 8px" }}>
                  {(["GET", "POST", "PUT", "PATCH", "DELETE"] as ArchitectureHttpMethod[]).map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
                <input value={apiPath} onChange={(event) => setApiPath(event.target.value)} data-testid="architecture-api-path" aria-label={copy.apiPath} placeholder={copy.apiPath} style={{ minWidth: 0, height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={apiName} onChange={(event) => setApiName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addApi(); }} data-testid="architecture-api-name" aria-label={copy.apiName} placeholder={copy.apiName} style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }} />
                <button type="button" onClick={addApi} data-testid="architecture-add-api" className="m3-press" style={{ height: 44, border: "none", borderRadius: 22, padding: "0 14px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{copy.addApi}</button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {apiNodes.map((node) => (
                  <div key={node.id} data-testid={`architecture-api-${node.id}`} style={card(p.tertiaryContainer, p.onTertiaryContainer)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 900 }}>{copy.apiBadge}</div>
                      <select value={node.method} onChange={(event) => onUpdateApi(node.id, { method: event.target.value as ArchitectureHttpMethod })} aria-label="HTTP method" style={{ marginLeft: "auto", height: 30, borderRadius: 12, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 6px", fontWeight: 800 }}>
                        {(["GET", "POST", "PUT", "PATCH", "DELETE"] as ArchitectureHttpMethod[]).map((method) => <option key={method} value={method}>{method}</option>)}
                      </select>
                    </div>
                    <div style={{ marginTop: 5, fontWeight: 850 }}>{node.name}</div>
                    <div style={{ marginTop: 3, fontSize: 12, fontFamily: "monospace", overflowWrap: "anywhere" }}>{node.path}</div>
                    <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <button type="button" onClick={() => { const nextName = window.prompt(copy.apiName, node.name); if (nextName === null) return; const nextPath = window.prompt(copy.apiPath, node.path); if (nextPath !== null) onUpdateApi(node.id, { name: nextName, path: nextPath }); }} aria-label={copy.editApi} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>
                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDeleteApi)) onDeleteApi(node.id); }} aria-label={copy.deleteApi} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>
                    </div>
                  </div>
                ))}
                {!apiNodes.length && <div style={{ ...card(p.surfaceContainerLow, p.onSurfaceVariant), fontSize: 13 }}>{copy.none}</div>}
              </div>
            </div>
          </section>

          <section style={{ borderTop: `1px solid ${p.outlineVariant}`, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: p.onSurfaceVariant, marginBottom: 10 }}>{copy.links}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <select value={from} onChange={(event) => setFrom(event.target.value)} data-testid="architecture-link-from" aria-label={copy.source} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px" }}>
                <option value="">{copy.source}</option>
                {options.map((option) => <option key={`from-${architectureEndpointKey(option.endpoint)}`} value={architectureEndpointKey(option.endpoint)}>{option.endpoint.kind === "frame" ? copy.screenBadge : option.endpoint.kind === "api" ? copy.apiBadge : copy.actionBadge} · {option.label}</option>)}
              </select>
              <select value={to} onChange={(event) => setTo(event.target.value)} data-testid="architecture-link-to" aria-label={copy.target} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px" }}>
                <option value="">{copy.target}</option>
                {options.map((option) => <option key={`to-${architectureEndpointKey(option.endpoint)}`} value={architectureEndpointKey(option.endpoint)}>{option.endpoint.kind === "frame" ? copy.screenBadge : option.endpoint.kind === "api" ? copy.apiBadge : copy.actionBadge} · {option.label}</option>)}
              </select>
              <input value={label} onChange={(event) => setLabel(event.target.value)} aria-label={copy.label} placeholder={copy.label} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }} />
              <button type="button" onClick={addLink} data-testid="architecture-add-link" className="m3-press" style={{ height: 44, border: "none", borderRadius: 22, padding: "0 14px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer" }}>{copy.addLink}</button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {flow.edges.map((edge) => {
                const fromLabel = labels.get(architectureEndpointKey(edge.from)) ?? architectureEndpointKey(edge.from);
                const toLabel = labels.get(architectureEndpointKey(edge.to)) ?? architectureEndpointKey(edge.to);
                return (
                  <div key={edge.id} data-testid={`architecture-edge-${edge.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, background: p.surfaceContainerLow, border: `1px solid ${p.outlineVariant}` }}>
                    <span style={{ fontWeight: 750 }}>{fromLabel}</span>
                    <Icon name="arrow_forward" size={20} />
                    <span style={{ fontWeight: 750 }}>{toLabel}</span>
                    {edge.label && <span style={{ fontSize: 12, color: p.onSurfaceVariant }}>· {edge.label}</span>}
                    <button type="button" onClick={() => onDeleteEdge(edge.id)} aria-label={copy.deleteLink} className="m3-press" style={{ marginLeft: "auto", width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: p.error, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="link_off" size={18} /></button>
                  </div>
                );
              })}
              {!flow.edges.length && <div style={{ fontSize: 13, color: p.onSurfaceVariant, padding: 6 }}>{copy.none}</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
