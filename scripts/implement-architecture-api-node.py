from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def insert_before(path: str, marker: str, addition: str):
    p = Path(path)
    text = p.read_text()
    if marker not in text:
        raise SystemExit(f"marker not found in {path}: {marker[:120]!r}")
    p.write_text(text.replace(marker, addition + marker, 1))


# ---- model ----
replace_once(
    "lib/tokens.ts",
    '''export type ArchitectureNodeKind = "action";\n\nexport type ArchitectureActionNode = {\n  id: string;\n  kind: "action";\n  name: string;\n  note?: string;\n};\n\nexport type ArchitectureEndpointKind = "frame" | ArchitectureNodeKind;\n''',
    '''export type ArchitectureNodeKind = "action" | "api";\n\nexport type ArchitectureActionNode = {\n  id: string;\n  kind: "action";\n  name: string;\n  note?: string;\n};\n\nexport type ArchitectureHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";\n\n/** Design-only API endpoint. It describes an integration; it never executes a request. */\nexport type ArchitectureApiNode = {\n  id: string;\n  kind: "api";\n  name: string;\n  method: ArchitectureHttpMethod;\n  path: string;\n  note?: string;\n};\n\nexport type ArchitectureNode = ArchitectureActionNode | ArchitectureApiNode;\n\nexport type ArchitectureEndpointKind = "frame" | ArchitectureNodeKind;\n''',
)
replace_once(
    "lib/tokens.ts",
    '''export type ArchitectureFlow = {\n  version: 1;\n  nodes: ArchitectureActionNode[];\n  edges: ArchitectureEdge[];\n};''',
    '''export type ArchitectureFlow = {\n  version: 1;\n  nodes: ArchitectureNode[];\n  edges: ArchitectureEdge[];\n};''',
)

# ---- project import/export validation ----
replace_once(
    "lib/project.ts",
    '''const validArchitectureEndpoint = (value: unknown) =>\n  isRecord(value) &&\n  (value.kind === "frame" || value.kind === "action") &&\n  typeof value.id === "string" &&\n  value.id.length > 0;\n\nconst validArchitectureNode = (value: unknown) =>\n  isRecord(value) &&\n  value.kind === "action" &&\n  typeof value.id === "string" &&\n  value.id.length > 0 &&\n  typeof value.name === "string" &&\n  (value.note === undefined || typeof value.note === "string");''',
    '''const validArchitectureEndpoint = (value: unknown) =>\n  isRecord(value) &&\n  (value.kind === "frame" || value.kind === "action" || value.kind === "api") &&\n  typeof value.id === "string" &&\n  value.id.length > 0;\n\nconst ARCHITECTURE_HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);\n\nconst validArchitectureNode = (value: unknown) => {\n  if (!isRecord(value) || typeof value.id !== "string" || !value.id || typeof value.name !== "string") return false;\n  if (value.note !== undefined && typeof value.note !== "string") return false;\n  if (value.kind === "action") return true;\n  return value.kind === "api" &&\n    typeof value.method === "string" &&\n    ARCHITECTURE_HTTP_METHODS.has(value.method) &&\n    typeof value.path === "string" &&\n    value.path.length > 0;\n};''',
)

# ---- architecture commands and graph helpers ----
replace_once(
    "lib/architecture-flow.ts",
    '''  ArchitectureActionNode,\n  ArchitectureEdge,''',
    '''  ArchitectureActionNode,\n  ArchitectureApiNode,\n  ArchitectureEdge,''',
)
replace_once(
    "lib/architecture-flow.ts",
    '''  if (endpoint.kind === "frame") return frames.some((frame) => frame.id === endpoint.id);\n  return flow.nodes.some((node) => node.id === endpoint.id);''',
    '''  if (endpoint.kind === "frame") return frames.some((frame) => frame.id === endpoint.id);\n  return flow.nodes.some((node) => node.kind === endpoint.kind && node.id === endpoint.id);''',
)
insert_before(
    "lib/architecture-flow.ts",
    '''export function renameArchitectureAction(''',
    '''export function addArchitectureApi(\n  flow: ArchitectureFlow,\n  api: ArchitectureApiNode,\n): ArchitectureFlow {\n  const name = api.name.trim();\n  const path = api.path.trim();\n  if (!name || !path || flow.nodes.some((node) => node.kind === "api" && node.id === api.id)) return flow;\n  return { ...flow, nodes: [...flow.nodes, { ...api, name, path }] };\n}\n\nexport function updateArchitectureApi(\n  flow: ArchitectureFlow,\n  id: string,\n  patch: Partial<Pick<ArchitectureApiNode, "name" | "method" | "path" | "note">>,\n): ArchitectureFlow {\n  const index = flow.nodes.findIndex((node) => node.kind === "api" && node.id === id);\n  if (index < 0) return flow;\n  const current = flow.nodes[index] as ArchitectureApiNode;\n  const next = {\n    ...current,\n    ...patch,\n    name: patch.name === undefined ? current.name : patch.name.trim(),\n    path: patch.path === undefined ? current.path : patch.path.trim(),\n  };\n  if (!next.name || !next.path) return flow;\n  if (JSON.stringify(current) === JSON.stringify(next)) return flow;\n  const nodes = [...flow.nodes];\n  nodes[index] = next;\n  return { ...flow, nodes };\n}\n\nexport function deleteArchitectureApi(flow: ArchitectureFlow, id: string): ArchitectureFlow {\n  if (!flow.nodes.some((node) => node.kind === "api" && node.id === id)) return flow;\n  return {\n    ...flow,\n    nodes: flow.nodes.filter((node) => !(node.kind === "api" && node.id === id)),\n    edges: flow.edges.filter(\n      (edge) =>\n        !(edge.from.kind === "api" && edge.from.id === id) &&\n        !(edge.to.kind === "api" && edge.to.id === id),\n    ),\n  };\n}\n\n''',
)
replace_once(
    "lib/architecture-flow.ts",
    '''    ...flow.nodes.map((node) => ({\n      endpoint: { kind: "action" as const, id: node.id },\n      label: node.name,\n    })),''',
    '''    ...flow.nodes.map((node) => ({\n      endpoint: { kind: node.kind, id: node.id },\n      label: node.kind === "api" ? `${node.method} ${node.path} · ${node.name}` : node.name,\n    })),''',
)
replace_once(
    "lib/architecture-flow.ts",
    '''  for (const action of flow.nodes) {\n    const endpoint: ArchitectureEndpoint = { kind: "action", id: action.id };''',
    '''  for (const action of flow.nodes.filter((node): node is ArchitectureActionNode => node.kind === "action")) {\n    const endpoint: ArchitectureEndpoint = { kind: "action", id: action.id };''',
)

# ---- Architecture UI ----
replace_once(
    "components/ArchitectureFlow.tsx",
    '''  ArchitectureEndpoint,\n  ArchitectureFlow,''',
    '''  ArchitectureApiNode,\n  ArchitectureEndpoint,\n  ArchitectureFlow,\n  ArchitectureHttpMethod,''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''  if (!id || (kind !== "frame" && kind !== "action")) return null;''',
    '''  if (!id || (kind !== "frame" && kind !== "action" && kind !== "api")) return null;''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''  onAddAction,\n  onRenameAction,\n  onDeleteAction,\n  onConnect,''',
    '''  onAddAction,\n  onRenameAction,\n  onDeleteAction,\n  onAddApi,\n  onUpdateApi,\n  onDeleteApi,\n  onConnect,''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''  onAddAction: (name: string) => void;\n  onRenameAction: (id: string, name: string) => void;\n  onDeleteAction: (id: string) => void;\n  onConnect:''',
    '''  onAddAction: (name: string) => void;\n  onRenameAction: (id: string, name: string) => void;\n  onDeleteAction: (id: string) => void;\n  onAddApi: (name: string, method: ArchitectureHttpMethod, path: string) => void;\n  onUpdateApi: (id: string, patch: Partial<Pick<ArchitectureApiNode, "name" | "method" | "path">>) => void;\n  onDeleteApi: (id: string) => void;\n  onConnect:''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''    subtitle: lang === "ja" ? "ScreenとActionの意味上の流れを可視化します" : lang === "zh" ? "可视化 Screen 与 Action 的语义流程" : lang === "ko" ? "Screen과 Action의 의미 흐름을 시각화합니다" : "Visualize the semantic flow between Screens and Actions",''',
    '''    subtitle: lang === "ja" ? "Screen・Action・APIの意味上の流れを可視化します" : lang === "zh" ? "可视化 Screen、Action 与 API 的语义流程" : lang === "ko" ? "Screen, Action, API의 의미 흐름을 시각화합니다" : "Visualize the semantic flow between Screens, Actions, and APIs",''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''    actions: "Actions",\n    links:''',
    '''    actions: "Actions",\n    apis: "APIs",\n    links:''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''    addAction: lang === "ja" ? "Actionを追加" : lang === "zh" ? "添加Action" : lang === "ko" ? "Action 추가" : "Add Action",\n    actionName: lang === "ja" ? "処理名（例: ログインを検証）" : "Action name (e.g. Validate login)",''',
    '''    addAction: lang === "ja" ? "Actionを追加" : lang === "zh" ? "添加Action" : lang === "ko" ? "Action 추가" : "Add Action",\n    actionName: lang === "ja" ? "処理名（例: ログインを検証）" : "Action name (e.g. Validate login)",\n    addApi: lang === "ja" ? "APIを追加" : "Add API",\n    apiName: lang === "ja" ? "API名（例: ログインAPI）" : "API name (e.g. Login API)",\n    apiPath: lang === "ja" ? "パス（例: /api/login）" : "Path (e.g. /api/login)",\n    editApi: lang === "ja" ? "APIを編集" : "Edit API",\n    deleteApi: lang === "ja" ? "APIを削除" : "Delete API",''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''    confirmDelete: lang === "ja" ? "このActionと接続を削除しますか？" : "Delete this Action and its links?",\n    screenBadge: "Screen",\n    actionBadge: "Action",''',
    '''    confirmDelete: lang === "ja" ? "このActionと接続を削除しますか？" : "Delete this Action and its links?",\n    confirmDeleteApi: lang === "ja" ? "このAPIと接続を削除しますか？" : "Delete this API and its links?",\n    screenBadge: "Screen",\n    actionBadge: "Action",\n    apiBadge: "API",''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''  const [actionName, setActionName] = useState("");\n  const [from, setFrom] = useState("");''',
    '''  const [actionName, setActionName] = useState("");\n  const [apiName, setApiName] = useState("");\n  const [apiMethod, setApiMethod] = useState<ArchitectureHttpMethod>("GET");\n  const [apiPath, setApiPath] = useState("");\n  const [from, setFrom] = useState("");''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;\n  const diagnostics =''',
    '''  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;\n  const actionNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "action"), [flow.nodes]);\n  const apiNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "api"), [flow.nodes]);\n  const diagnostics =''',
)
insert_before(
    "components/ArchitectureFlow.tsx",
    '''  const addLink = () => {''',
    '''  const addApi = () => {\n    const name = apiName.trim();\n    const path = apiPath.trim();\n    if (!name || !path) return;\n    onAddApi(name, apiMethod, path);\n    setApiName("");\n    setApiPath("");\n  };\n\n''',
)
# Visual graph node styles/badges.
replace_once(
    "components/ArchitectureFlow.tsx",
    '''                  const action = node.endpoint.kind === "action";\n                  const nodeDiagnostics =''',
    '''                  const action = node.endpoint.kind === "action";\n                  const api = node.endpoint.kind === "api";\n                  const nodeDiagnostics =''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''                        background: action ? p.secondaryContainer : p.surface,\n                        color: action ? p.onSecondaryContainer : p.onSurface,''',
    '''                        background: api ? p.tertiaryContainer : action ? p.secondaryContainer : p.surface,\n                        color: api ? p.onTertiaryContainer : action ? p.onSecondaryContainer : p.onSurface,''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''                      <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 900, color: action ? p.primary : p.onSurfaceVariant }}>\n                        <Icon name={action ? "bolt" : "web_asset"} size={16} />\n                        {action ? copy.actionBadge : copy.screenBadge}''',
    '''                      <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, fontWeight: 900, color: action ? p.primary : api ? p.onTertiaryContainer : p.onSurfaceVariant }}>\n                        <Icon name={action ? "bolt" : api ? "api" : "web_asset"} size={16} />\n                        {action ? copy.actionBadge : api ? copy.apiBadge : copy.screenBadge}''',
)
# Replace Screen/Action listing section with Screen/Action/API listing.
p = Path("components/ArchitectureFlow.tsx")
text = p.read_text()
start_marker = '          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>'
end_marker = '          <section style={{ borderTop: `1px solid ${p.outlineVariant}`, paddingTop: 16 }}>'
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("architecture management section markers not found")
management = '''          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14 }}>
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

'''
p.write_text(text[:start] + management + text[end:])
# Link option badges must distinguish API.
replace_once(
    "components/ArchitectureFlow.tsx",
    '''{option.endpoint.kind === "frame" ? copy.screenBadge : copy.actionBadge} · {option.label}''',
    '''{option.endpoint.kind === "frame" ? copy.screenBadge : option.endpoint.kind === "api" ? copy.apiBadge : copy.actionBadge} · {option.label}''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''{option.endpoint.kind === "frame" ? copy.screenBadge : copy.actionBadge} · {option.label}''',
    '''{option.endpoint.kind === "frame" ? copy.screenBadge : option.endpoint.kind === "api" ? copy.apiBadge : copy.actionBadge} · {option.label}''',
)

# ---- page/controller integration ----
replace_once(
    "app/page.tsx",
    '''  ArchitectureEndpoint,\n  ArchitectureFlow,''',
    '''  ArchitectureApiNode,\n  ArchitectureEndpoint,\n  ArchitectureFlow,\n  ArchitectureHttpMethod,''',
)
replace_once(
    "app/page.tsx",
    '''import { addArchitectureAction, connectArchitectureNodes, deleteArchitectureAction, deleteArchitectureEdge, renameArchitectureAction } from "@/lib/architecture-flow";''',
    '''import { addArchitectureAction, addArchitectureApi, connectArchitectureNodes, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, renameArchitectureAction, updateArchitectureApi } from "@/lib/architecture-flow";''',
)
insert_before(
    "app/page.tsx",
    '''  const connectArchitecture = (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) =>''',
    '''  const addArchitectureApiNode = (name: string, method: ArchitectureHttpMethod, path: string) =>\n    commitArchitecture(addArchitectureApi(architecture, { id: uid(), kind: "api", name, method, path }));\n  const updateArchitectureApiNode = (id: string, patch: Partial<Pick<ArchitectureApiNode, "name" | "method" | "path">>) =>\n    commitArchitecture(updateArchitectureApi(architecture, id, patch));\n  const deleteArchitectureApiNode = (id: string) =>\n    commitArchitecture(deleteArchitectureApi(architecture, id));\n''',
)
replace_once(
    "app/page.tsx",
    '''              onDeleteAction={deleteArchitectureActionNode}\n              onConnect={connectArchitecture}''',
    '''              onDeleteAction={deleteArchitectureActionNode}\n              onAddApi={addArchitectureApiNode}\n              onUpdateApi={updateArchitectureApiNode}\n              onDeleteApi={deleteArchitectureApiNode}\n              onConnect={connectArchitecture}''',
)

# ---- unit tests ----
replace_once(
    "lib/architecture-flow.test.ts",
    '''  addArchitectureAction,\n  architectureEndpointOptions,''',
    '''  addArchitectureAction,\n  addArchitectureApi,\n  architectureEndpointOptions,''',
)
replace_once(
    "lib/architecture-flow.test.ts",
    '''  deleteArchitectureAction,\n  deleteArchitectureEdge,''',
    '''  deleteArchitectureAction,\n  deleteArchitectureApi,\n  deleteArchitectureEdge,''',
)
replace_once(
    "lib/architecture-flow.test.ts",
    '''  renameArchitectureAction,\n  layoutArchitectureGraph,''',
    '''  renameArchitectureAction,\n  updateArchitectureApi,\n  layoutArchitectureGraph,''',
)
insert_before(
    "lib/architecture-flow.test.ts",
    '''  it("connects known screen/action endpoints and rejects duplicate or self links",''',
    '''  it("adds, updates and deletes design-only API nodes", () => {\n    const added = addArchitectureApi(empty(), { id: "login", kind: "api", name: " Login API ", method: "POST", path: " /api/login " });\n    expect(added.nodes).toEqual([{ id: "login", kind: "api", name: "Login API", method: "POST", path: "/api/login" }]);\n    expect(architectureEndpointOptions(frames, added).map((item) => [item.endpoint.kind, item.label])).toContainEqual(["api", "POST /api/login · Login API"]);\n    const updated = updateArchitectureApi(added, "login", { method: "PATCH", path: "/api/session" });\n    expect(updated.nodes[0]).toMatchObject({ kind: "api", method: "PATCH", path: "/api/session" });\n    const linked = connectArchitectureNodes(updated, { id: "to-api", from: { kind: "frame", id: "home" }, to: { kind: "api", id: "login" } }, frames);\n    expect(linked.edges).toHaveLength(1);\n    const deleted = deleteArchitectureApi(linked, "login");\n    expect(deleted.nodes).toEqual([]);\n    expect(deleted.edges).toEqual([]);\n  });\n\n''',
)
insert_before(
    "lib/project.test.ts",
    '''  it("opens legacy raw Doc files through the version-0 migration path",''',
    '''  it("round-trips design-only API architecture nodes in version 1 projects", () => {\n    const withApi = {\n      ...doc,\n      architecture: {\n        version: 1 as const,\n        nodes: [{ id: "login-api", kind: "api" as const, name: "Login API", method: "POST" as const, path: "/api/login" }],\n        edges: [{ id: "edge", from: { kind: "frame" as const, id: "home" }, to: { kind: "api" as const, id: "login-api" } }],\n      },\n    };\n    expect(parseProjectText(serializeProject(withApi))).toEqual(withApi);\n  });\n\n''',
)

# ---- E2E ----
p = Path("e2e/core.e2e.ts")
text = p.read_text()
if 'architecture API nodes are design-only and participate in undo' not in text:
    text += '''\n\ntest("architecture API nodes are design-only and participate in undo", async ({ page }) => {\n  await openSeeded(page);\n  await page.getByTitle("App architecture").click();\n  const architecture = page.getByTestId("architecture-flow");\n  await architecture.getByTestId("architecture-api-method").selectOption("POST");\n  await architecture.getByTestId("architecture-api-path").fill("/api/login");\n  await architecture.getByTestId("architecture-api-name").fill("Login API");\n  await architecture.getByTestId("architecture-add-api").click();\n\n  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });\n  await expect(apiNode).toHaveCount(1);\n  await expect.poll(() => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { kind?: string }) => item.kind === "api") : null;\n    return node ? `${node.method} ${node.path} ${node.name}` : "";\n  })).toBe("POST /api/login Login API");\n\n  await architecture.getByTestId("architecture-connect-mode").click();\n  await architecture.getByTestId("architecture-graph-node-frame-home").click();\n  await apiNode.click();\n  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(1);\n\n  await architecture.getByRole("button", { name: "Close", exact: true }).click();\n  await page.getByTitle("Undo").click();\n  await expect.poll(() => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    return raw ? JSON.parse(raw).architecture?.edges?.length ?? 0 : 0;\n  })).toBe(0);\n});\n'''
    p.write_text(text)

# ---- docs ----
replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''- The first persisted semantic node kind is `action`.''',
    '''- Persisted semantic node kinds are `action` and design-only `api`.''',
)
replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''Action (persisted semantic node)\n       |\n       v\nScreen / Action''',
    '''Action (persisted semantic node)\n       |\n       v\nAPI (design-only semantic node)\n       |\n       v\nScreen / Action / API''',
)
replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''- `nodes`: Action nodes\n- `edges`: semantic links whose endpoints reference either a Frame or Action''',
    '''- `nodes`: Action and API nodes\n- `edges`: semantic links whose endpoints reference a Frame, Action, or API\n- API nodes store a display name, HTTP method, and path only; they never execute network requests''',
)
replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''The editor now renders the combined Screen + Action model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action nodes remain the only persisted semantic nodes.''',
    '''The editor now renders the combined Screen + Action + API model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action and API nodes are persisted semantic nodes.''',
)
replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''Use the visual Action flow and Action diagnostics in real projects first. The next diagnostics extension should cover missing semantic endpoints (for example, a deleted Screen still referenced by an architecture link). The next model extension remains an `api` node, and execution semantics should still wait for a concrete use case. Do not make Architecture Flow a second source of truth for Screen navigation.''',
    '''Use the Screen → Action → API model in real projects before adding more node types. API nodes are intentionally descriptive only: no fetch, credentials, request body, response schema, or execution state is attached yet. A later `agent` or `database` node should only be added after a concrete design need appears. Do not make Architecture Flow a second source of truth for Screen navigation.''',
)
replace_once(
    "docs/TODO.md",
    '''- [ ] Extend Architecture Flow with an `api` node only after Action nodes are useful in real projects; keep execution semantics out of the first model.''',
    '''- [x] Extend Architecture Flow with a design-only `api` node (name, HTTP method, path) while keeping execution semantics out of the model.\n- [ ] Evaluate an `agent` or `database` architecture node only after real projects demonstrate the need; do not add execution semantics by default.''',
)

print("architecture API node implementation applied")
