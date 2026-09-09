from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# 1) Extend the in-memory Doc with a small, additive semantic architecture layer.
replace_once(
    "lib/tokens.ts",
    "export type Doc = {\n",
    '''export type ArchitectureNodeKind = "action";\n\nexport type ArchitectureActionNode = {\n  id: string;\n  kind: "action";\n  name: string;\n  note?: string;\n};\n\nexport type ArchitectureEndpointKind = "frame" | ArchitectureNodeKind;\n\nexport type ArchitectureEndpoint = {\n  kind: ArchitectureEndpointKind;\n  id: string;\n};\n\nexport type ArchitectureEdge = {\n  id: string;\n  from: ArchitectureEndpoint;\n  to: ArchitectureEndpoint;\n  label?: string;\n};\n\nexport type ArchitectureFlow = {\n  version: 1;\n  nodes: ArchitectureActionNode[];\n  edges: ArchitectureEdge[];\n};\n\nexport const emptyArchitectureFlow = (): ArchitectureFlow => ({\n  version: 1,\n  nodes: [],\n  edges: [],\n});\n\nexport type Doc = {\n''',
)
replace_once(
    "lib/tokens.ts",
    "  groups: Group[];\n  frames: Frame[];\n  paletteKey: string;\n",
    "  groups: Group[];\n  frames: Frame[];\n  /** semantic app flow; screen nodes remain derived from `frames` */\n  architecture?: ArchitectureFlow;\n  paletteKey: string;\n",
)

# 2) Validate the additive architecture payload when project JSON is loaded.
architecture_validation = '''const validArchitectureEndpoint = (value: unknown) =>\n  isRecord(value) &&\n  (value.kind === "frame" || value.kind === "action") &&\n  typeof value.id === "string" &&\n  value.id.length > 0;\n\nconst validArchitectureNode = (value: unknown) =>\n  isRecord(value) &&\n  value.kind === "action" &&\n  typeof value.id === "string" &&\n  value.id.length > 0 &&\n  typeof value.name === "string" &&\n  (value.note === undefined || typeof value.note === "string");\n\nconst validArchitectureEdge = (value: unknown) =>\n  isRecord(value) &&\n  typeof value.id === "string" &&\n  value.id.length > 0 &&\n  validArchitectureEndpoint(value.from) &&\n  validArchitectureEndpoint(value.to) &&\n  (value.label === undefined || typeof value.label === "string");\n\nconst validArchitecture = (value: unknown) =>\n  value === undefined ||\n  (isRecord(value) &&\n    value.version === 1 &&\n    Array.isArray(value.nodes) &&\n    value.nodes.every(validArchitectureNode) &&\n    Array.isArray(value.edges) &&\n    value.edges.every(validArchitectureEdge));\n\n'''
replace_once(
    "lib/project.ts",
    "/**\n * Version 0 is the historical raw `Doc` JSON format, before project files had\n",
    architecture_validation + "/**\n * Version 0 is the historical raw `Doc` JSON format, before project files had\n",
)
replace_once(
    "lib/project.ts",
    "  value.frames.every(validFrame) &&\n  (value.platform === undefined || isPlatform(value.platform));\n",
    "  value.frames.every(validFrame) &&\n  validArchitecture(value.architecture) &&\n  (value.platform === undefined || isPlatform(value.platform));\n",
)

# 3) Pure architecture-flow commands. Existing navigation continues to come from Frame/Item actions.
Path("lib/architecture-flow.ts").write_text(r'''import type {
  ArchitectureActionNode,
  ArchitectureEdge,
  ArchitectureEndpoint,
  ArchitectureFlow,
  Frame,
} from "./tokens";

export const architectureEndpointKey = (endpoint: ArchitectureEndpoint) =>
  `${endpoint.kind}:${endpoint.id}`;

export function architectureEndpointExists(
  endpoint: ArchitectureEndpoint,
  frames: readonly Frame[],
  flow: ArchitectureFlow,
): boolean {
  if (endpoint.kind === "frame") return frames.some((frame) => frame.id === endpoint.id);
  return flow.nodes.some((node) => node.id === endpoint.id);
}

export function addArchitectureAction(
  flow: ArchitectureFlow,
  action: ArchitectureActionNode,
): ArchitectureFlow {
  const name = action.name.trim();
  if (!name || flow.nodes.some((node) => node.id === action.id)) return flow;
  return {
    ...flow,
    nodes: [...flow.nodes, { ...action, name }],
  };
}

export function renameArchitectureAction(
  flow: ArchitectureFlow,
  id: string,
  name: string,
): ArchitectureFlow {
  const nextName = name.trim();
  if (!nextName) return flow;
  const index = flow.nodes.findIndex((node) => node.id === id);
  if (index < 0 || flow.nodes[index].name === nextName) return flow;
  const nodes = [...flow.nodes];
  nodes[index] = { ...nodes[index], name: nextName };
  return { ...flow, nodes };
}

export function deleteArchitectureAction(
  flow: ArchitectureFlow,
  id: string,
): ArchitectureFlow {
  if (!flow.nodes.some((node) => node.id === id)) return flow;
  return {
    ...flow,
    nodes: flow.nodes.filter((node) => node.id !== id),
    edges: flow.edges.filter(
      (edge) =>
        !(edge.from.kind === "action" && edge.from.id === id) &&
        !(edge.to.kind === "action" && edge.to.id === id),
    ),
  };
}

export function connectArchitectureNodes(
  flow: ArchitectureFlow,
  edge: ArchitectureEdge,
  frames: readonly Frame[],
): ArchitectureFlow {
  if (architectureEndpointKey(edge.from) === architectureEndpointKey(edge.to)) return flow;
  if (!architectureEndpointExists(edge.from, frames, flow)) return flow;
  if (!architectureEndpointExists(edge.to, frames, flow)) return flow;
  if (
    flow.edges.some(
      (current) =>
        architectureEndpointKey(current.from) === architectureEndpointKey(edge.from) &&
        architectureEndpointKey(current.to) === architectureEndpointKey(edge.to),
    )
  ) {
    return flow;
  }
  const label = edge.label?.trim();
  return {
    ...flow,
    edges: [...flow.edges, { ...edge, label: label || undefined }],
  };
}

export function deleteArchitectureEdge(
  flow: ArchitectureFlow,
  id: string,
): ArchitectureFlow {
  if (!flow.edges.some((edge) => edge.id === id)) return flow;
  return { ...flow, edges: flow.edges.filter((edge) => edge.id !== id) };
}

export type ArchitectureEndpointOption = {
  endpoint: ArchitectureEndpoint;
  label: string;
};

export function architectureEndpointOptions(
  frames: readonly Frame[],
  flow: ArchitectureFlow,
): ArchitectureEndpointOption[] {
  return [
    ...frames.map((frame) => ({
      endpoint: { kind: "frame" as const, id: frame.id },
      label: frame.name || "Screen",
    })),
    ...flow.nodes.map((node) => ({
      endpoint: { kind: "action" as const, id: node.id },
      label: node.name,
    })),
  ];
}
''')

Path("lib/architecture-flow.test.ts").write_text(r'''import { describe, expect, it } from "vitest";
import type { ArchitectureFlow, Frame } from "./tokens";
import {
  addArchitectureAction,
  architectureEndpointOptions,
  connectArchitectureNodes,
  deleteArchitectureAction,
  deleteArchitectureEdge,
  renameArchitectureAction,
} from "./architecture-flow";

const empty = (): ArchitectureFlow => ({ version: 1, nodes: [], edges: [] });
const frames: Frame[] = [{ id: "home", name: "Home", x: 0, y: 0 }];

describe("architecture flow commands", () => {
  it("adds and renames semantic Action nodes", () => {
    const added = addArchitectureAction(empty(), { id: "load", kind: "action", name: " Load profile " });
    expect(added.nodes).toEqual([{ id: "load", kind: "action", name: "Load profile" }]);
    const renamed = renameArchitectureAction(added, "load", "Fetch profile");
    expect(renamed.nodes[0].name).toBe("Fetch profile");
  });

  it("connects known screen/action endpoints and rejects duplicate or self links", () => {
    const flow = addArchitectureAction(empty(), { id: "load", kind: "action", name: "Load profile" });
    const edge = {
      id: "edge-1",
      from: { kind: "frame" as const, id: "home" },
      to: { kind: "action" as const, id: "load" },
      label: " tap ",
    };
    const connected = connectArchitectureNodes(flow, edge, frames);
    expect(connected.edges).toHaveLength(1);
    expect(connected.edges[0].label).toBe("tap");
    expect(connectArchitectureNodes(connected, { ...edge, id: "edge-2" }, frames)).toBe(connected);
    expect(
      connectArchitectureNodes(
        connected,
        { id: "self", from: { kind: "frame", id: "home" }, to: { kind: "frame", id: "home" } },
        frames,
      ),
    ).toBe(connected);
  });

  it("deleting an Action removes its incident architecture links", () => {
    const withAction = addArchitectureAction(empty(), { id: "load", kind: "action", name: "Load" });
    const connected = connectArchitectureNodes(
      withAction,
      { id: "edge", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "load" } },
      frames,
    );
    const deleted = deleteArchitectureAction(connected, "load");
    expect(deleted.nodes).toEqual([]);
    expect(deleted.edges).toEqual([]);
  });

  it("lists screen and Action endpoints and deletes individual links", () => {
    const withAction = addArchitectureAction(empty(), { id: "save", kind: "action", name: "Save" });
    expect(architectureEndpointOptions(frames, withAction).map((item) => item.label)).toEqual(["Home", "Save"]);
    const connected = connectArchitectureNodes(
      withAction,
      { id: "edge", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "save" } },
      frames,
    );
    expect(deleteArchitectureEdge(connected, "edge").edges).toEqual([]);
  });
});
''')

# 4) First visible editor for the semantic architecture layer.
Path("components/ArchitectureFlow.tsx").write_text(r'''"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ArchitectureEndpoint,
  ArchitectureFlow,
  Frame,
  Palette,
} from "@/lib/tokens";
import {
  architectureEndpointKey,
  architectureEndpointOptions,
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
    subtitle: lang === "ja" ? "画面は既存Screenから参照し、処理だけをActionとして追加します" : lang === "zh" ? "屏幕来自现有Screen，仅将处理添加为Action" : lang === "ko" ? "화면은 기존 Screen을 참조하고 처리만 Action으로 추가합니다" : "Screens stay derived from the editor; only semantic Actions are added here",
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
    screenBadge: lang === "ja" ? "Screen" : "Screen",
    actionBadge: "Action",
  };
  const [actionName, setActionName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [label, setLabel] = useState("");
  const options = useMemo(() => architectureEndpointOptions(frames, flow), [frames, flow]);
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((option) => map.set(architectureEndpointKey(option.endpoint), option.label));
    return map;
  }, [options]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const card = (background: string, color: string): React.CSSProperties => ({
    borderRadius: 18,
    padding: 14,
    background,
    color,
    border: `1px solid ${p.outlineVariant}`,
  });

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
        <div style={{ width: "min(1100px, 100%)", margin: "0 auto", display: "grid", gap: 16 }}>
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
                    <button type="button" onClick={() => onDeleteEdge(edge.id)} aria-label={lang === "ja" ? "接続を削除" : "Delete link"} className="m3-press" style={{ marginLeft: "auto", width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: p.error, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="link_off" size={18} /></button>
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
''')

# 5) Wire the feature into desktop/mobile UI and normal document history/autosave.
replace_once(
    "app/page.tsx",
    "  Action,\n  actionsOf,\n",
    "  Action,\n  ArchitectureEndpoint,\n  ArchitectureFlow,\n  emptyArchitectureFlow,\n  actionsOf,\n",
)
replace_once(
    "app/page.tsx",
    'import { NavigationGraph } from "@/components/NavigationGraph";\n',
    'import { NavigationGraph } from "@/components/NavigationGraph";\nimport { ArchitectureFlowView } from "@/components/ArchitectureFlow";\n',
)
replace_once(
    "app/page.tsx",
    'import { createNavigationRoute, editNavigationEdge } from "@/lib/navigation-graph-edit";\n',
    'import { createNavigationRoute, editNavigationEdge } from "@/lib/navigation-graph-edit";\nimport { addArchitectureAction, connectArchitectureNodes, deleteArchitectureAction, deleteArchitectureEdge, renameArchitectureAction } from "@/lib/architecture-flow";\n',
)
replace_once(
    "app/page.tsx",
    '  const [frames, setFrames] = useState<Frame[]>(DEFAULT_SEED_FRAMES);\n',
    '  const [frames, setFrames] = useState<Frame[]>(DEFAULT_SEED_FRAMES);\n  const [architecture, setArchitecture] = useState<ArchitectureFlow>(emptyArchitectureFlow);\n',
)
replace_once(
    "app/page.tsx",
    '  const [graphOpen, setGraphOpen] = useState(false);\n',
    '  const [graphOpen, setGraphOpen] = useState(false);\n  const [architectureOpen, setArchitectureOpen] = useState(false);\n',
)
replace_once(
    "app/page.tsx",
    '    if (Array.isArray(doc.frames)) setFrames(doc.frames);\n    if (typeof doc.paletteKey === "string" && doc.paletteKey) setPaletteKey(doc.paletteKey);\n',
    '    if (Array.isArray(doc.frames)) setFrames(doc.frames);\n    if (doc.architecture?.version === 1) setArchitecture(doc.architecture);\n    else if (reset) setArchitecture(emptyArchitectureFlow());\n    if (typeof doc.paletteKey === "string" && doc.paletteKey) setPaletteKey(doc.paletteKey);\n',
)
replace_once(
    "app/page.tsx",
    '      groups,\n      frames,\n      paletteKey,\n',
    '      groups,\n      frames,\n      architecture,\n      paletteKey,\n',
)
replace_once(
    "app/page.tsx",
    '  }, [editAccess, groups, frames, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme, activeProjectId]);\n',
    '  }, [editAccess, groups, frames, architecture, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme, activeProjectId]);\n',
)
replace_once(
    "app/page.tsx",
    '  const clearAll = () => {\n    setConfirmClear(false);\n    if (groupsRef.current.length === 0 && framesRef.current.length === 0)\n      return;\n',
    '  const clearAll = () => {\n    setConfirmClear(false);\n    if (groupsRef.current.length === 0 && framesRef.current.length === 0 && architecture.nodes.length === 0 && architecture.edges.length === 0)\n      return;\n',
)
replace_once(
    "app/page.tsx",
    '    snapshot();\n    setGroups([]);\n    setFrames([]);\n',
    '    snapshot(true);\n    setGroups([]);\n    setFrames([]);\n    setArchitecture(emptyArchitectureFlow());\n',
)
replace_once(
    "app/page.tsx",
    '  /* ---------- render ---------- */\n',
    '''  const commitArchitecture = (next: ArchitectureFlow) => {\n    if (next === architecture) return;\n    snapshot(true);\n    setArchitecture(next);\n  };\n\n  const addArchitectureActionNode = (name: string) =>\n    commitArchitecture(addArchitectureAction(architecture, { id: uid(), kind: "action", name }));\n  const renameArchitectureActionNode = (id: string, name: string) =>\n    commitArchitecture(renameArchitectureAction(architecture, id, name));\n  const deleteArchitectureActionNode = (id: string) =>\n    commitArchitecture(deleteArchitectureAction(architecture, id));\n  const connectArchitecture = (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) =>\n    commitArchitecture(connectArchitectureNodes(architecture, { id: uid(), from, to, label }, framesRef.current));\n  const removeArchitectureEdge = (id: string) =>\n    commitArchitecture(deleteArchitectureEdge(architecture, id));\n\n  /* ---------- render ---------- */\n''',
)
replace_once(
    "app/page.tsx",
    '    () => ({ groups, frames, paletteKey, frame, title, brief, promptEdit, platform: platform ?? undefined, customPalette: customPalette ?? undefined, dynamicColor, theme }),\n    [groups, frames, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme],\n',
    '    () => ({ groups, frames, architecture, paletteKey, frame, title, brief, promptEdit, platform: platform ?? undefined, customPalette: customPalette ?? undefined, dynamicColor, theme }),\n    [groups, frames, architecture, paletteKey, frame, title, brief, promptEdit, platform, customPalette, dynamicColor, theme],\n',
)
replace_once(
    "app/page.tsx",
    '            onGraph={() => setGraphOpen(true)}\n            onProjects={() => setProjectManagerOpen(true)}\n',
    '            onGraph={() => setGraphOpen(true)}\n            onArchitecture={() => setArchitectureOpen(true)}\n            onProjects={() => setProjectManagerOpen(true)}\n',
)
replace_once(
    "app/page.tsx",
    '                  onGraph={() => {\n                    setSheet(null);\n                    setGraphOpen(true);\n                  }}\n                  onProjects={() => {\n',
    '                  onGraph={() => {\n                    setSheet(null);\n                    setGraphOpen(true);\n                  }}\n                  onArchitecture={() => {\n                    setSheet(null);\n                    setArchitectureOpen(true);\n                  }}\n                  onProjects={() => {\n',
)
replace_once(
    "app/page.tsx",
    '          {projectManagerOpen && (\n',
    '''          {architectureOpen && (\n            <ArchitectureFlowView\n              flow={architecture}\n              frames={frames}\n              palette={p}\n              onClose={() => setArchitectureOpen(false)}\n              onAddAction={addArchitectureActionNode}\n              onRenameAction={renameArchitectureActionNode}\n              onDeleteAction={deleteArchitectureActionNode}\n              onConnect={connectArchitecture}\n              onDeleteEdge={removeArchitectureEdge}\n            />\n          )}\n\n          {projectManagerOpen && (\n''',
)

# Toolbar: one explicit entry next to Screen flow.
replace_once(
    "components/Toolbar.tsx",
    '  onGraph,\n  onProjects,\n',
    '  onGraph,\n  onArchitecture,\n  onProjects,\n',
)
replace_once(
    "components/Toolbar.tsx",
    '  onGraph?: () => void;\n  onProjects?: () => void;\n',
    '  onGraph?: () => void;\n  onArchitecture?: () => void;\n  onProjects?: () => void;\n',
)
replace_once(
    "components/Toolbar.tsx",
    '  const graphTitle = lang === "ja" ? "画面フロー" : lang === "zh" ? "画面流程" : lang === "ko" ? "화면 흐름" : "Screen flow";\n',
    '  const graphTitle = lang === "ja" ? "画面フロー" : lang === "zh" ? "画面流程" : lang === "ko" ? "화면 흐름" : "Screen flow";\n  const architectureTitle = lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture";\n',
)
replace_once(
    "components/Toolbar.tsx",
    '''          {onGraph && (\n            <IconBtn\n              icon="account_tree"\n              p={p}\n              onClick={onGraph}\n              title={graphTitle}\n              size={40}\n            />\n          )}\n''',
    '''          {onGraph && (\n            <IconBtn\n              icon="account_tree"\n              p={p}\n              onClick={onGraph}\n              title={graphTitle}\n              size={40}\n            />\n          )}\n          {onArchitecture && (\n            <IconBtn\n              icon="schema"\n              p={p}\n              onClick={onArchitecture}\n              title={architectureTitle}\n              size={40}\n            />\n          )}\n''',
)

# Mobile Screens sheet entry.
replace_once(
    "components/MobileScreens.tsx",
    '  onGraph,\n  onProjects,\n',
    '  onGraph,\n  onArchitecture,\n  onProjects,\n',
)
replace_once(
    "components/MobileScreens.tsx",
    '  onGraph: () => void;\n  onProjects: () => void;\n',
    '  onGraph: () => void;\n  onArchitecture: () => void;\n  onProjects: () => void;\n',
)
replace_once(
    "components/MobileScreens.tsx",
    '''      <button\n        type="button"\n        onClick={onGraph}\n''',
    '''      <button\n        type="button"\n        onClick={onArchitecture}\n        aria-label={lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture"}\n        className="m3-press"\n        style={{\n          marginTop: 12,\n          width: "100%",\n          minHeight: 52,\n          border: `1px solid ${p.outlineVariant}`,\n          borderRadius: 26,\n          background: p.tertiaryContainer,\n          color: p.onTertiaryContainer,\n          display: "flex",\n          alignItems: "center",\n          justifyContent: "center",\n          gap: 8,\n          cursor: "pointer",\n          fontSize: 15,\n          fontWeight: 700,\n        }}\n      >\n        <Icon name="schema" size={22} />\n        {lang === "ja" ? "アプリアーキテクチャ" : lang === "zh" ? "应用架构" : lang === "ko" ? "앱 아키텍처" : "App architecture"}\n      </button>\n\n      <button\n        type="button"\n        onClick={onGraph}\n''',
)

# 6) E2E: Action creation persists through the normal Doc/local-project path and participates in Undo.
e2e = Path("e2e/core.e2e.ts")
e2e.write_text(e2e.read_text() + r'''

test("app architecture adds semantic Action nodes and Undo restores the previous project state", async ({ page }) => {
  await openSeeded(page);

  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await expect(architecture).toBeVisible();
  await page.getByTestId("architecture-action-name").fill("Validate login");
  await page.getByTestId("architecture-add-action").click();
  await expect(architecture.getByText("Validate login", { exact: true })).toBeVisible();

  await expect.poll(() =>
    page.evaluate(() => {
      const raw = localStorage.getItem("m3e:doc");
      const doc = raw ? JSON.parse(raw) : null;
      return doc?.architecture?.nodes?.some((node: { name?: string }) => node.name === "Validate login") ?? false;
    }),
  ).toBe(true);

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await page.getByTitle("App architecture").click();
  await expect(page.getByTestId("architecture-flow").getByText("Validate login", { exact: true })).toHaveCount(0);
});
''')

# 7) Document the boundary so Screen navigation and semantic architecture do not diverge.
Path("docs/ARCHITECTURE_FLOW.md").write_text(r'''# App Architecture Flow

## Purpose

The Architecture Flow is a semantic layer for describing what the app does between screens. It is intentionally separate from the existing Screen Flow navigation graph.

- Screen nodes are always derived from `Doc.frames`; they are never duplicated in architecture state.
- Existing UI navigation remains derived from `Item.action`, `Item.actions`, and `Frame.swipe`.
- `Doc.architecture` stores only semantic architecture nodes/links that cannot be inferred from the visual editor.
- The first persisted semantic node kind is `action`.
- Architecture links are descriptive today; they do **not** change Preview navigation or invent hidden UI behavior.

This keeps one source of truth for screens/navigation while creating a safe extension point for later `api`, `agent`, or `database` nodes.

## Current model

```text
Screen (derived from Frame)
       |
       v
Action (persisted semantic node)
       |
       v
Screen / Action
```

`ArchitectureFlow` is additive and versioned independently inside the document:

- `version: 1`
- `nodes`: Action nodes
- `edges`: semantic links whose endpoints reference either a Frame or Action

No manual graph coordinates are persisted. Layout remains a UI concern until real projects demonstrate a need for pinned positions.

## Editing and persistence

The editor exposes **App architecture** on desktop and from the mobile Screens sheet. Action/link mutations:

- enter normal document Undo/Redo;
- autosave into the active local project;
- travel with JSON project export/import;
- require no backend or cloud service.

Deleting an Action also deletes architecture links incident to that Action. Deleting a Screen does not currently rewrite semantic links automatically; missing Screen endpoints are preserved as explicit architecture information for a later diagnostics pass rather than silently guessing intent.

## Next safe extension

After Action nodes have real usage, extend the semantic node union one kind at a time (`api`, then optionally `agent`/`database`) and add diagnostics before adding execution semantics. Do not make Architecture Flow a second source of truth for Screen navigation.
''')

replace_once(
    "docs/TODO.md",
    "## Priority B — Product direction\n\n",
    "## Priority B — Product direction\n\n- [x] Add an App Architecture Flow foundation with persisted semantic Action nodes/links while keeping Screen nodes derived from `Frame`. See `docs/ARCHITECTURE_FLOW.md`.\n- [ ] Extend Architecture Flow with an `api` node only after Action nodes are useful in real projects; keep execution semantics out of the first model.\n",
)
replace_once(
    "docs/ROADMAP.md",
    "## Phase 5 — Optional secure/cloud expansion\n",
    '''## Phase 5 — App Architecture Flow\n\nStatus: **foundation implemented**.\n\n- Keep Screen nodes derived from the existing `Frame` model rather than storing duplicate screens.\n- Persist semantic Action nodes and semantic links as optional document architecture metadata.\n- Expose the same architecture editor from desktop and mobile.\n- Keep Action/link changes inside normal project autosave, JSON import/export and Undo/Redo.\n- Do not make semantic architecture links drive Preview navigation.\n- Add `api` / `agent` / `database` node kinds only when a concrete workflow requires them.\n\nSee `docs/ARCHITECTURE_FLOW.md`.\n\n## Phase 6 — Optional secure/cloud expansion\n''',
)

print("architecture flow foundation patched")
