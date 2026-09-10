from pathlib import Path


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding="utf-8")


component = r'''"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  ArchitectureEndpoint,
  ArchitectureFlow,
  Frame,
  Palette,
} from "@/lib/tokens";
import {
  architectureEndpointKey,
  architectureEndpointOptions,
  layoutArchitectureGraph,
} from "@/lib/architecture-flow";
import { useLang } from "@/lib/i18n";
import { Icon } from "./M3Node";

const parseEndpoint = (value: string): ArchitectureEndpoint | null => {
  const colon = value.indexOf(":");
  if (colon <= 0) return null;
  const kind = value.slice(0, colon);
  const id = value.slice(colon + 1);
  if (!id || (kind !== "frame" && kind !== "action")) return null;
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
  onConnect: (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) => void;
  onDeleteEdge: (id: string) => void;
}) {
  const lang = useLang();
  const copy = {
    title: lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture",
    subtitle: lang === "ja" ? "ScreenとActionの意味上の流れを可視化します" : lang === "zh" ? "可视化 Screen 与 Action 的语义流程" : lang === "ko" ? "Screen과 Action의 의미 흐름을 시각화합니다" : "Visualize the semantic flow between Screens and Actions",
    visual: lang === "ja" ? "フロー図" : lang === "zh" ? "流程图" : lang === "ko" ? "흐름도" : "Flow graph",
    graphHint: lang === "ja" ? "位置は自動配置です。ノード位置はプロジェクトには保存しません。" : "Layout is automatic and node positions are not stored in the project.",
    connectMode: lang === "ja" ? "グラフ上で接続" : "Connect on graph",
    endConnectMode: lang === "ja" ? "接続モードを終了" : "Exit connect mode",
    pickSource: lang === "ja" ? "開始ノードを選択してください" : "Choose a source node",
    pickTarget: lang === "ja" ? "接続先ノードを選択してください" : "Choose a target node",
    selectedLink: lang === "ja" ? "選択した接続" : "Selected link",
    deleteLink: lang === "ja" ? "接続を削除" : "Delete link",
    screens: lang === "ja" ? "画面" : lang === "zh" ? "屏幕" : lang === "ko" ? "화면" : "Screens",
    actions: "Actions",
    links: lang === "ja" ? "意味上の接続" : lang === "zh" ? "语义连接" : lang === "ko" ? "의미 연결" : "Semantic links",
    addAction: lang === "ja" ? "Actionを追加" : lang === "zh" ? "添加Action" : lang === "ko" ? "Action 추가" : "Add Action",
    actionName: lang === "ja" ? "処理名（例: ログインを検証）" : "Action name (e.g. Validate login)",
    rename: lang === "ja" ? "Action名を変更" : "Rename Action",
    deleteAction: lang === "ja" ? "Actionを削除" : "Delete Action",
    source: lang === "ja" ? "開始" : "From",
    target: lang === "ja" ? "接続先" : "To",
    label: lang === "ja" ? "ラベル（任意）" : "Label (optional)",
    addLink: lang === "ja" ? "接続を追加" : "Add link",
    none: lang === "ja" ? "まだありません" : "None yet",
    close: lang === "ja" ? "閉じる" : lang === "zh" ? "关闭" : lang === "ko" ? "닫기" : "Close",
    confirmDelete: lang === "ja" ? "このActionと接続を削除しますか？" : "Delete this Action and its links?",
    screenBadge: "Screen",
    actionBadge: "Action",
  };
  const [actionName, setActionName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [label, setLabel] = useState("");
  const [connectMode, setConnectMode] = useState(false);
  const [graphSource, setGraphSource] = useState<ArchitectureEndpoint | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const options = useMemo(() => architectureEndpointOptions(frames, flow), [frames, flow]);
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((option) => map.set(architectureEndpointKey(option.endpoint), option.label));
    return map;
  }, [options]);
  const layout = useMemo(() => layoutArchitectureGraph(frames, flow), [frames, flow]);
  const graphNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.key, node])), [layout.nodes]);
  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

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

  const addLink = () => {
    const source = parseEndpoint(from);
    const target = parseEndpoint(to);
    if (!source || !target) return;
    onConnect(source, target, label);
    setLabel("");
  };

  const clickGraphNode = (endpoint: ArchitectureEndpoint) => {
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
                        border: `${source ? 3 : 1}px solid ${source ? p.primary : p.outlineVariant}`,
                        borderRadius: 20,
                        padding: "11px 13px",
                        background: action ? p.secondaryContainer : p.surface,
                        color: action ? p.onSecondaryContainer : p.onSurface,
                        boxShadow: source ? `0 0 0 4px ${p.primaryContainer}` : "0 4px 12px rgba(0,0,0,0.08)",
                        textAlign: "left",
                        cursor: connectMode ? "crosshair" : "default",
                        overflow: "hidden",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 900, color: action ? p.primary : p.onSurfaceVariant }}>
                        <Icon name={action ? "bolt" : "web_asset"} size={16} />
                        {action ? copy.actionBadge : copy.screenBadge}
                      </span>
                      <span style={{ display: "block", marginTop: 6, fontSize: 14, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
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
                <span style={{ marginLeft: "auto", fontSize: 12, color: p.onSurfaceVariant }}>{flow.nodes.length}</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  value={actionName}
                  onChange={(event) => setActionName(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") addAction(); }}
                  data-testid="architecture-action-name"
                  aria-label={copy.actionName}
                  placeholder={copy.actionName}
                  style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }}
                />
                <button type="button" onClick={addAction} data-testid="architecture-add-action" className="m3-press" style={{ height: 44, border: "none", borderRadius: 22, padding: "0 14px", background: p.primary, color: p.onPrimary, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>{copy.addAction}</button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {flow.nodes.map((node) => (
                  <div key={node.id} data-testid={`architecture-action-${node.id}`} style={card(p.secondaryContainer, p.onSecondaryContainer)}>
                    <div style={{ fontSize: 10, fontWeight: 900, color: p.primary }}>{copy.actionBadge}</div>
                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</div>
                      <button type="button" onClick={() => { const next = window.prompt(copy.rename, node.name); if (next !== null) onRenameAction(node.id, next); }} aria-label={copy.rename} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>
                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDelete)) onDeleteAction(node.id); }} aria-label={copy.deleteAction} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>
                    </div>
                  </div>
                ))}
                {!flow.nodes.length && <div style={{ ...card(p.surfaceContainerLow, p.onSurfaceVariant), fontSize: 13 }}>{copy.none}</div>}
              </div>
            </div>
          </section>

          <section style={{ borderTop: `1px solid ${p.outlineVariant}`, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: p.onSurfaceVariant, marginBottom: 10 }}>{copy.links}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              <select value={from} onChange={(event) => setFrom(event.target.value)} data-testid="architecture-link-from" aria-label={copy.source} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px" }}>
                <option value="">{copy.source}</option>
                {options.map((option) => <option key={`from-${architectureEndpointKey(option.endpoint)}`} value={architectureEndpointKey(option.endpoint)}>{option.endpoint.kind === "frame" ? copy.screenBadge : copy.actionBadge} · {option.label}</option>)}
              </select>
              <select value={to} onChange={(event) => setTo(event.target.value)} data-testid="architecture-link-to" aria-label={copy.target} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px" }}>
                <option value="">{copy.target}</option>
                {options.map((option) => <option key={`to-${architectureEndpointKey(option.endpoint)}`} value={architectureEndpointKey(option.endpoint)}>{option.endpoint.kind === "frame" ? copy.screenBadge : copy.actionBadge} · {option.label}</option>)}
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
'''
write("components/ArchitectureFlow.tsx", component)

helper_path = Path("lib/architecture-flow.ts")
helper = helper_path.read_text(encoding="utf-8")
if "export function layoutArchitectureGraph" not in helper:
    helper += r'''

export type ArchitectureGraphLayoutNode = {
  key: string;
  endpoint: ArchitectureEndpoint;
  label: string;
  kind: ArchitectureEndpoint["kind"];
  column: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ArchitectureGraphLayout = {
  nodes: ArchitectureGraphLayoutNode[];
  width: number;
  height: number;
};

const ARCH_GRAPH_NODE_W = 196;
const ARCH_GRAPH_NODE_H = 78;
const ARCH_GRAPH_GAP_X = 96;
const ARCH_GRAPH_GAP_Y = 36;
const ARCH_GRAPH_PAD = 30;

/**
 * Deterministic, UI-only layered layout for the semantic architecture graph.
 * No coordinates are written to the project. DAG sections advance left-to-right;
 * any cyclic remainder is placed in a final column instead of inventing persisted state.
 */
export function layoutArchitectureGraph(
  frames: readonly Frame[],
  flow: ArchitectureFlow,
): ArchitectureGraphLayout {
  const options = architectureEndpointOptions(frames, flow);
  const keys = options.map((option) => architectureEndpointKey(option.endpoint));
  const known = new Set(keys);
  const incoming = new Map(keys.map((key) => [key, 0]));
  const outgoing = new Map(keys.map((key) => [key, [] as string[]]));

  for (const edge of flow.edges) {
    const from = architectureEndpointKey(edge.from);
    const to = architectureEndpointKey(edge.to);
    if (!known.has(from) || !known.has(to) || from === to) continue;
    outgoing.get(from)?.push(to);
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
  }

  const remainingIncoming = new Map(incoming);
  const columns = new Map<string, number>();
  const processed = new Set<string>();
  let frontier = keys.filter((key) => (remainingIncoming.get(key) ?? 0) === 0);
  let column = 0;

  while (frontier.length) {
    const next = new Set<string>();
    for (const key of frontier) {
      if (processed.has(key)) continue;
      processed.add(key);
      columns.set(key, column);
      for (const target of outgoing.get(key) ?? []) {
        const count = Math.max(0, (remainingIncoming.get(target) ?? 0) - 1);
        remainingIncoming.set(target, count);
        if (count === 0) next.add(target);
      }
    }
    frontier = keys.filter((key) => next.has(key) && !processed.has(key));
    column += 1;
  }

  const cycleColumn = Math.max(0, column);
  for (const key of keys) {
    if (!processed.has(key)) columns.set(key, cycleColumn);
  }

  const rows = new Map<number, number>();
  const nodes = options.map((option) => {
    const key = architectureEndpointKey(option.endpoint);
    const nodeColumn = columns.get(key) ?? 0;
    const row = rows.get(nodeColumn) ?? 0;
    rows.set(nodeColumn, row + 1);
    return {
      key,
      endpoint: option.endpoint,
      label: option.label,
      kind: option.endpoint.kind,
      column: nodeColumn,
      x: ARCH_GRAPH_PAD + nodeColumn * (ARCH_GRAPH_NODE_W + ARCH_GRAPH_GAP_X),
      y: ARCH_GRAPH_PAD + row * (ARCH_GRAPH_NODE_H + ARCH_GRAPH_GAP_Y),
      w: ARCH_GRAPH_NODE_W,
      h: ARCH_GRAPH_NODE_H,
    };
  });

  const maxColumn = nodes.reduce((max, node) => Math.max(max, node.column), 0);
  const maxRows = Math.max(1, ...rows.values());
  return {
    nodes,
    width: Math.max(320, ARCH_GRAPH_PAD * 2 + (maxColumn + 1) * ARCH_GRAPH_NODE_W + maxColumn * ARCH_GRAPH_GAP_X),
    height: Math.max(260, ARCH_GRAPH_PAD * 2 + maxRows * ARCH_GRAPH_NODE_H + Math.max(0, maxRows - 1) * ARCH_GRAPH_GAP_Y),
  };
}
'''
    helper_path.write_text(helper, encoding="utf-8")

test_path = Path("lib/architecture-flow.test.ts")
test_text = test_path.read_text(encoding="utf-8")
if "layoutArchitectureGraph," not in test_text:
    test_text = test_text.replace(
        "  renameArchitectureAction,\n} from \"./architecture-flow\";",
        "  renameArchitectureAction,\n  layoutArchitectureGraph,\n} from \"./architecture-flow\";",
    )
if "architecture graph layout" not in test_text:
    test_text += r'''


describe("architecture graph layout", () => {
  it("places a Screen → Action → Screen chain in successive columns", () => {
    const chainFrames: Frame[] = [
      { id: "home", name: "Home", x: 0, y: 0 },
      { id: "done", name: "Done", x: 500, y: 0 },
    ];
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [{ id: "validate", kind: "action", name: "Validate" }],
      edges: [
        { id: "a", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" } },
        { id: "b", from: { kind: "action", id: "validate" }, to: { kind: "frame", id: "done" } },
      ],
    };
    const layout = layoutArchitectureGraph(chainFrames, flow);
    const byKey = new Map(layout.nodes.map((node) => [node.key, node]));
    expect(byKey.get("frame:home")?.column).toBe(0);
    expect(byKey.get("action:validate")?.column).toBe(1);
    expect(byKey.get("frame:done")?.column).toBe(2);
    expect(layout.width).toBeGreaterThan(600);
  });

  it("keeps cycles finite and deterministic without persisted coordinates", () => {
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [
        { id: "a", kind: "action", name: "A" },
        { id: "b", kind: "action", name: "B" },
      ],
      edges: [
        { id: "ab", from: { kind: "action", id: "a" }, to: { kind: "action", id: "b" } },
        { id: "ba", from: { kind: "action", id: "b" }, to: { kind: "action", id: "a" } },
      ],
    };
    const first = layoutArchitectureGraph([], flow);
    const second = layoutArchitectureGraph([], flow);
    expect(first).toEqual(second);
    expect(first.nodes).toHaveLength(2);
    expect(first.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
  });
});
'''
    test_path.write_text(test_text, encoding="utf-8")

e2e_path = Path("e2e/core.e2e.ts")
e2e = e2e_path.read_text(encoding="utf-8")
if "architecture visual graph creates semantic links" not in e2e:
    e2e += r'''


test("architecture visual graph creates semantic links and participates in undo", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture).toBeVisible();

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  await expect(actionNode).toHaveCount(1);

  await architecture.getByTestId("architecture-connect-mode").click();
  await architecture.getByTestId("architecture-graph-node-frame-home").click();
  await actionNode.click();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(1);

  const storedEdgeCount = () => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.edges?.length ?? 0 : 0;
  });
  await expect.poll(storedEdgeCount).toBe(1);

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(storedEdgeCount).toBe(0);
});
'''
    e2e_path.write_text(e2e, encoding="utf-8")

doc_path = Path("docs/ARCHITECTURE_FLOW.md")
doc = doc_path.read_text(encoding="utf-8")
if "## Visual graph" not in doc:
    doc = doc.replace(
        "## Editing and persistence\n",
        "## Visual graph\n\nThe editor now renders the combined Screen + Action model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action nodes remain the only persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology.\n\n## Editing and persistence\n",
    )
    doc = doc.replace(
        "## Next safe extension\n\nAfter Action nodes have real usage, extend the semantic node union one kind at a time (`api`, then optionally `agent`/`database`) and add diagnostics before adding execution semantics.",
        "## Next safe extension\n\nUse the visual Action flow in real projects first. The next model extension remains an `api` node, followed by diagnostics for missing semantic endpoints before any execution semantics are introduced.",
    )
    doc_path.write_text(doc, encoding="utf-8")

todo_path = Path("docs/TODO.md")
todo = todo_path.read_text(encoding="utf-8")
needle = "- [x] Add an App Architecture Flow foundation with persisted semantic Action nodes/links while keeping Screen nodes derived from `Frame`. See `docs/ARCHITECTURE_FLOW.md`.\n"
visual_item = "- [x] Render Architecture Flow as a deterministic Screen + Action graph with direct visual connection and edge selection/deletion, without persisting graph coordinates.\n"
if visual_item not in todo and needle in todo:
    todo = todo.replace(needle, needle + visual_item)
    todo_path.write_text(todo, encoding="utf-8")

roadmap_path = Path("docs/ROADMAP.md")
roadmap = roadmap_path.read_text(encoding="utf-8")
roadmap_item = "- Render Screen + Action nodes as a deterministic visual graph with direct graph connection and edge selection/deletion.\n"
anchor = "- Keep Action/link changes inside normal project autosave, JSON import/export and Undo/Redo.\n"
if roadmap_item not in roadmap and anchor in roadmap:
    roadmap = roadmap.replace(anchor, anchor + roadmap_item)
    roadmap = roadmap.replace("Status: **foundation implemented**.", "Status: **interactive Action-flow foundation implemented**.")
    roadmap_path.write_text(roadmap, encoding="utf-8")
