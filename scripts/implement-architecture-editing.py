from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing replacement target: {label}")
    return text.replace(old, new, 1)


# ---------- architecture domain commands ----------
flow_path = Path("lib/architecture-flow.ts")
flow = flow_path.read_text()

flow = replace_once(
    flow,
    '''export function deleteArchitectureApi(flow: ArchitectureFlow, id: string): ArchitectureFlow {\n''',
    '''export function duplicateArchitectureNode(\n  flow: ArchitectureFlow,\n  endpoint: ArchitectureEndpoint,\n  newId: string,\n  newName: string,\n): ArchitectureFlow {\n  if (endpoint.kind === "frame") return flow;\n  const source = flow.nodes.find((node) => node.kind === endpoint.kind && node.id === endpoint.id);\n  const id = newId.trim();\n  const name = newName.trim();\n  if (!source || !id || !name || flow.nodes.some((node) => node.id === id)) return flow;\n  return {\n    ...flow,\n    // Duplicate only the semantic node. Connections are intentionally not copied,\n    // because duplicating topology would silently invent app behavior.\n    nodes: [...flow.nodes, { ...source, id, name }],\n  };\n}\n\nexport function deleteArchitectureApi(flow: ArchitectureFlow, id: string): ArchitectureFlow {\n''',
    "duplicate architecture node command",
)

flow = replace_once(
    flow,
    '''export function deleteArchitectureEdge(\n  flow: ArchitectureFlow,\n  id: string,\n): ArchitectureFlow {\n''',
    '''export function updateArchitectureEdgeLabel(\n  flow: ArchitectureFlow,\n  id: string,\n  label: string,\n): ArchitectureFlow {\n  const index = flow.edges.findIndex((edge) => edge.id === id);\n  if (index < 0) return flow;\n  const nextLabel = label.trim() || undefined;\n  const current = flow.edges[index];\n  if (current.label === nextLabel) return flow;\n  const edges = [...flow.edges];\n  edges[index] = { ...current, label: nextLabel };\n  return { ...flow, edges };\n}\n\nexport function deleteArchitectureEdge(\n  flow: ArchitectureFlow,\n  id: string,\n): ArchitectureFlow {\n''',
    "architecture edge label command",
)
flow_path.write_text(flow)


# ---------- unit tests ----------
test_path = Path("lib/architecture-flow.test.ts")
tests = test_path.read_text()
tests = replace_once(
    tests,
    '''  diagnoseArchitectureFlow,\n  renameArchitectureAction,\n  updateArchitectureApi,\n  layoutArchitectureGraph,\n''',
    '''  diagnoseArchitectureFlow,\n  duplicateArchitectureNode,\n  renameArchitectureAction,\n  updateArchitectureApi,\n  updateArchitectureEdgeLabel,\n  layoutArchitectureGraph,\n''',
    "architecture command imports",
)

command_marker = '''  it("deleting an Action removes its incident architecture links", () => {\n'''
command_tests = '''  it("duplicates semantic nodes without duplicating their connections", () => {\n    const flow: ArchitectureFlow = {\n      version: 1,\n      nodes: [\n        { id: "validate", kind: "action", name: "Validate", note: "check credentials" },\n        { id: "login", kind: "api", name: "Login API", method: "POST", path: "/api/login" },\n      ],\n      edges: [\n        { id: "home-validate", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" } },\n      ],\n    };\n\n    const actionCopy = duplicateArchitectureNode(flow, { kind: "action", id: "validate" }, "validate-copy", "Validate copy");\n    expect(actionCopy.nodes).toContainEqual({ id: "validate-copy", kind: "action", name: "Validate copy", note: "check credentials" });\n    expect(actionCopy.edges).toEqual(flow.edges);\n\n    const apiCopy = duplicateArchitectureNode(actionCopy, { kind: "api", id: "login" }, "login-copy", "Login API copy");\n    expect(apiCopy.nodes).toContainEqual({ id: "login-copy", kind: "api", name: "Login API copy", method: "POST", path: "/api/login" });\n    expect(apiCopy.edges).toEqual(flow.edges);\n    expect(duplicateArchitectureNode(apiCopy, { kind: "frame", id: "home" }, "screen-copy", "Home copy")).toBe(apiCopy);\n    expect(duplicateArchitectureNode(apiCopy, { kind: "action", id: "validate" }, "login-copy", "Collision")).toBe(apiCopy);\n  });\n\n  it("updates and clears a semantic link label without changing its endpoints", () => {\n    const flow: ArchitectureFlow = {\n      version: 1,\n      nodes: [{ id: "validate", kind: "action", name: "Validate" }],\n      edges: [{ id: "edge", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" }, label: "tap" }],\n    };\n    const updated = updateArchitectureEdgeLabel(flow, "edge", "  submit  ");\n    expect(updated.edges[0]).toEqual({\n      id: "edge",\n      from: { kind: "frame", id: "home" },\n      to: { kind: "action", id: "validate" },\n      label: "submit",\n    });\n    const cleared = updateArchitectureEdgeLabel(updated, "edge", "   ");\n    expect(cleared.edges[0].label).toBeUndefined();\n    expect(updateArchitectureEdgeLabel(cleared, "missing", "x")).toBe(cleared);\n  });\n\n'''
if command_marker not in tests:
    raise SystemExit("missing architecture command test marker")
tests = tests.replace(command_marker, command_tests + command_marker, 1)
test_path.write_text(tests)


# ---------- page/controller wiring ----------
page_path = Path("app/page.tsx")
page = page_path.read_text()
page = replace_once(
    page,
    'import { addArchitectureAction, addArchitectureApi, connectArchitectureNodes, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, renameArchitectureAction, updateArchitectureApi } from "@/lib/architecture-flow";\n',
    'import { addArchitectureAction, addArchitectureApi, connectArchitectureNodes, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, duplicateArchitectureNode, renameArchitectureAction, updateArchitectureApi, updateArchitectureEdgeLabel } from "@/lib/architecture-flow";\n',
    "architecture page imports",
)

page = replace_once(
    page,
    '''  const deleteArchitectureApiNode = (id: string) =>\n    commitArchitecture(deleteArchitectureApi(architecture, id));\n  const connectArchitecture = (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) =>\n    commitArchitecture(connectArchitectureNodes(architecture, { id: uid(), from, to, label }, framesRef.current));\n  const removeArchitectureEdge = (id: string) =>\n    commitArchitecture(deleteArchitectureEdge(architecture, id));\n''',
    '''  const deleteArchitectureApiNode = (id: string) =>\n    commitArchitecture(deleteArchitectureApi(architecture, id));\n  const duplicateArchitectureSemanticNode = (endpoint: ArchitectureEndpoint) => {\n    if (endpoint.kind === "frame") return;\n    const source = architecture.nodes.find((node) => node.kind === endpoint.kind && node.id === endpoint.id);\n    if (!source) return;\n    const suffix = lang === "ja" ? " のコピー" : lang === "zh" ? " 副本" : lang === "ko" ? " 복사본" : " copy";\n    commitArchitecture(duplicateArchitectureNode(architecture, endpoint, uid(), `${source.name}${suffix}`));\n  };\n  const connectArchitecture = (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) =>\n    commitArchitecture(connectArchitectureNodes(architecture, { id: uid(), from, to, label }, framesRef.current));\n  const updateArchitectureLinkLabel = (id: string, label: string) =>\n    commitArchitecture(updateArchitectureEdgeLabel(architecture, id, label));\n  const removeArchitectureEdge = (id: string) =>\n    commitArchitecture(deleteArchitectureEdge(architecture, id));\n''',
    "architecture page handlers",
)

page = replace_once(
    page,
    '''              onUpdateApi={updateArchitectureApiNode}\n              onDeleteApi={deleteArchitectureApiNode}\n              onConnect={connectArchitecture}\n              onDeleteEdge={removeArchitectureEdge}\n''',
    '''              onUpdateApi={updateArchitectureApiNode}\n              onDeleteApi={deleteArchitectureApiNode}\n              onDuplicateNode={duplicateArchitectureSemanticNode}\n              onConnect={connectArchitecture}\n              onUpdateEdgeLabel={updateArchitectureLinkLabel}\n              onDeleteEdge={removeArchitectureEdge}\n''',
    "architecture view props",
)
page_path.write_text(page)


# ---------- Architecture Flow UI ----------
component_path = Path("components/ArchitectureFlow.tsx")
text = component_path.read_text()

text = replace_once(
    text,
    '''  onUpdateApi,\n  onDeleteApi,\n  onConnect,\n  onDeleteEdge,\n''',
    '''  onUpdateApi,\n  onDeleteApi,\n  onDuplicateNode,\n  onConnect,\n  onUpdateEdgeLabel,\n  onDeleteEdge,\n''',
    "architecture view prop destructuring",
)
text = replace_once(
    text,
    '''  onUpdateApi: (id: string, patch: Partial<Pick<ArchitectureApiNode, "name" | "method" | "path">>) => void;\n  onDeleteApi: (id: string) => void;\n  onConnect: (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) => void;\n  onDeleteEdge: (id: string) => void;\n''',
    '''  onUpdateApi: (id: string, patch: Partial<Pick<ArchitectureApiNode, "name" | "method" | "path">>) => void;\n  onDeleteApi: (id: string) => void;\n  onDuplicateNode: (endpoint: ArchitectureEndpoint) => void;\n  onConnect: (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) => void;\n  onUpdateEdgeLabel: (id: string, label: string) => void;\n  onDeleteEdge: (id: string) => void;\n''',
    "architecture view prop types",
)

text = replace_once(
    text,
    '''    selectedLink: lang === "ja" ? "選択した接続" : "Selected link",\n    deleteLink: lang === "ja" ? "接続を削除" : "Delete link",\n''',
    '''    selectedLink: lang === "ja" ? "選択した接続" : "Selected link",\n    editLinkLabel: lang === "ja" ? "接続ラベルを編集" : "Edit link label",\n    saveLinkLabel: lang === "ja" ? "ラベルを保存" : "Save label",\n    deleteLink: lang === "ja" ? "接続を削除" : "Delete link",\n''',
    "edge editing copy",
)
text = replace_once(
    text,
    '''    editApi: lang === "ja" ? "APIを編集" : "Edit API",\n    deleteApi: lang === "ja" ? "APIを削除" : "Delete API",\n    rename: lang === "ja" ? "Action名を変更" : "Rename Action",\n''',
    '''    editApi: lang === "ja" ? "APIを編集" : "Edit API",\n    deleteApi: lang === "ja" ? "APIを削除" : "Delete API",\n    editDetails: lang === "ja" ? "詳細を編集" : "Edit details",\n    duplicateNode: lang === "ja" ? "複製" : "Duplicate",\n    rename: lang === "ja" ? "Action名を変更" : "Rename Action",\n''',
    "node editing copy",
)

text = replace_once(
    text,
    '''  const [label, setLabel] = useState("");\n  const [connectMode, setConnectMode] = useState(false);\n''',
    '''  const [label, setLabel] = useState("");\n  const [edgeLabelDraft, setEdgeLabelDraft] = useState("");\n  const [connectMode, setConnectMode] = useState(false);\n''',
    "edge label draft state",
)

text = replace_once(
    text,
    '''  const relationshipLabel = relationshipTrace ? labels.get(relationshipTrace.focusKey) ?? relationshipTrace.focusKey : null;\n  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;\n''',
    '''  const relationshipLabel = relationshipTrace ? labels.get(relationshipTrace.focusKey) ?? relationshipTrace.focusKey : null;\n  const relationshipEndpoint = relationshipTrace ? parseEndpoint(relationshipTrace.focusKey) : null;\n  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;\n''',
    "relationship endpoint state",
)

text = replace_once(
    text,
    '''  useEffect(() => {\n    if (selectedEdgeId && !flow.edges.some((edge) => edge.id === selectedEdgeId)) {\n      setSelectedEdgeId(null);\n    }\n  }, [flow.edges, selectedEdgeId]);\n\n  useEffect(() => {\n''',
    '''  useEffect(() => {\n    if (selectedEdgeId && !flow.edges.some((edge) => edge.id === selectedEdgeId)) {\n      setSelectedEdgeId(null);\n    }\n  }, [flow.edges, selectedEdgeId]);\n\n  useEffect(() => {\n    setEdgeLabelDraft(selectedEdge?.label ?? "");\n  }, [selectedEdgeId, selectedEdge?.label]);\n\n  useEffect(() => {\n''',
    "selected edge label sync",
)

text = replace_once(
    text,
    '''  const diagnosticMessage = (kind: string, name: string, missingName?: string) => {\n''',
    '''  const focusDetailEditor = (endpoint: ArchitectureEndpoint) => {\n    if (endpoint.kind === "frame") return;\n    const cardElement = document.querySelector(`[data-testid="architecture-${endpoint.kind}-${endpoint.id}"]`) as HTMLElement | null;\n    cardElement?.scrollIntoView({ behavior: "smooth", block: "center" });\n    requestAnimationFrame(() => {\n      const edit = document.querySelector(`[data-testid="architecture-${endpoint.kind}-edit-${endpoint.id}"]`) as HTMLElement | null;\n      edit?.focus({ preventScroll: true });\n    });\n  };\n\n  const diagnosticMessage = (kind: string, name: string, missingName?: string) => {\n''',
    "focus detailed node editor",
)

relation_old = '''                <span data-testid="architecture-relation-downstream-count" style={{ fontSize: 11, fontWeight: 800, color: p.onPrimaryContainer, background: p.primaryContainer, borderRadius: 12, padding: "4px 8px" }}>{copy.relationDownstream} {relationshipTrace.downstreamNodeKeys.size}</span>\n                <button type="button" data-testid="architecture-clear-relation-focus" onClick={() => setHighlightedEndpointKey(null)} className="m3-press" style={{ marginLeft: "auto", minHeight: 32, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, background: p.surface, color: p.onSurfaceVariant, padding: "0 10px", fontWeight: 800, cursor: "pointer" }}>{copy.clearRelation}</button>\n'''
relation_new = '''                <span data-testid="architecture-relation-downstream-count" style={{ fontSize: 11, fontWeight: 800, color: p.onPrimaryContainer, background: p.primaryContainer, borderRadius: 12, padding: "4px 8px" }}>{copy.relationDownstream} {relationshipTrace.downstreamNodeKeys.size}</span>\n                {relationshipEndpoint && relationshipEndpoint.kind !== "frame" && (\n                  <>\n                    <button type="button" data-testid="architecture-edit-focused-node" onClick={() => focusDetailEditor(relationshipEndpoint)} className="m3-press" style={{ minHeight: 32, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, background: p.surface, color: p.onSurface, padding: "0 10px", fontWeight: 800, cursor: "pointer" }}>{copy.editDetails}</button>\n                    <button type="button" data-testid="architecture-duplicate-focused-node" onClick={() => onDuplicateNode(relationshipEndpoint)} className="m3-press" style={{ minHeight: 32, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, background: p.secondaryContainer, color: p.onSecondaryContainer, padding: "0 10px", fontWeight: 800, cursor: "pointer" }}>{copy.duplicateNode}</button>\n                  </>\n                )}\n                <button type="button" data-testid="architecture-clear-relation-focus" onClick={() => setHighlightedEndpointKey(null)} className="m3-press" style={{ marginLeft: "auto", minHeight: 32, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, background: p.surface, color: p.onSurfaceVariant, padding: "0 10px", fontWeight: 800, cursor: "pointer" }}>{copy.clearRelation}</button>\n'''
text = replace_once(text, relation_old, relation_new, "focused node edit controls")

edge_editor_old = '''            {(connectMode || selectedEdge) && (\n              <div data-testid={selectedEdge ? "architecture-graph-edge-editor" : "architecture-connect-status"} style={{ minHeight: 44, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${p.outlineVariant}`, background: p.surface }}>\n                {selectedEdge ? (\n                  <>\n                    <Icon name="link" size={19} />\n                    <span style={{ fontSize: 12, fontWeight: 800 }}>{copy.selectedLink}: {labels.get(architectureEndpointKey(selectedEdge.from)) ?? architectureEndpointKey(selectedEdge.from)} → {labels.get(architectureEndpointKey(selectedEdge.to)) ?? architectureEndpointKey(selectedEdge.to)}</span>\n                    <button type="button" onClick={() => { onDeleteEdge(selectedEdge.id); setSelectedEdgeId(null); }} className="m3-press" style={{ marginLeft: "auto", minHeight: 34, border: "none", borderRadius: 17, padding: "0 11px", background: p.errorContainer, color: p.onErrorContainer, fontWeight: 800, cursor: "pointer" }}>{copy.deleteLink}</button>\n                  </>\n                ) : (\n'''
edge_editor_new = '''            {(connectMode || selectedEdge) && (\n              <div data-testid={selectedEdge ? "architecture-graph-edge-editor" : "architecture-connect-status"} style={{ minHeight: 44, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: `1px solid ${p.outlineVariant}`, background: p.surface }}>\n                {selectedEdge ? (\n                  <>\n                    <Icon name="link" size={19} />\n                    <span style={{ fontSize: 12, fontWeight: 800, flex: "1 1 260px" }}>{copy.selectedLink}: {labels.get(architectureEndpointKey(selectedEdge.from)) ?? architectureEndpointKey(selectedEdge.from)} → {labels.get(architectureEndpointKey(selectedEdge.to)) ?? architectureEndpointKey(selectedEdge.to)}</span>\n                    <input\n                      data-testid="architecture-edge-label-editor"\n                      value={edgeLabelDraft}\n                      onChange={(event) => setEdgeLabelDraft(event.target.value)}\n                      onKeyDown={(event) => { if (event.key === "Enter") onUpdateEdgeLabel(selectedEdge.id, edgeLabelDraft); }}\n                      aria-label={copy.editLinkLabel}\n                      placeholder={copy.label}\n                      style={{ flex: "1 1 180px", minWidth: 150, height: 34, borderRadius: 17, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}\n                    />\n                    <button type="button" data-testid="architecture-save-edge-label" onClick={() => onUpdateEdgeLabel(selectedEdge.id, edgeLabelDraft)} disabled={(selectedEdge.label ?? "") === edgeLabelDraft.trim()} className="m3-press" style={{ minHeight: 34, border: "none", borderRadius: 17, padding: "0 11px", background: p.primaryContainer, color: p.onPrimaryContainer, fontWeight: 800, cursor: (selectedEdge.label ?? "") === edgeLabelDraft.trim() ? "default" : "pointer", opacity: (selectedEdge.label ?? "") === edgeLabelDraft.trim() ? 0.5 : 1 }}>{copy.saveLinkLabel}</button>\n                    <button type="button" onClick={() => { onDeleteEdge(selectedEdge.id); setSelectedEdgeId(null); }} className="m3-press" style={{ minHeight: 34, border: "none", borderRadius: 17, padding: "0 11px", background: p.errorContainer, color: p.onErrorContainer, fontWeight: 800, cursor: "pointer" }}>{copy.deleteLink}</button>\n                  </>\n                ) : (\n'''
text = replace_once(text, edge_editor_old, edge_editor_new, "selected edge label editor")

text = replace_once(
    text,
    '''                      <button type="button" onClick={() => { const next = window.prompt(copy.rename, node.name); if (next !== null) onRenameAction(node.id, next); }} aria-label={copy.rename} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>\n                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDelete)) onDeleteAction(node.id); }} aria-label={copy.deleteAction} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>\n''',
    '''                      <button type="button" data-testid={`architecture-action-edit-${node.id}`} onClick={() => { const next = window.prompt(copy.rename, node.name); if (next !== null) onRenameAction(node.id, next); }} aria-label={copy.rename} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>\n                      <button type="button" data-testid={`architecture-action-duplicate-${node.id}`} onClick={() => onDuplicateNode({ kind: "action", id: node.id })} aria-label={copy.duplicateNode} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="content_copy" size={18} /></button>\n                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDelete)) onDeleteAction(node.id); }} aria-label={copy.deleteAction} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>\n''',
    "action duplicate control",
)

text = replace_once(
    text,
    '''                      <button type="button" onClick={() => { const nextName = window.prompt(copy.apiName, node.name); if (nextName === null) return; const nextPath = window.prompt(copy.apiPath, node.path); if (nextPath !== null) onUpdateApi(node.id, { name: nextName, path: nextPath }); }} aria-label={copy.editApi} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>\n                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDeleteApi)) onDeleteApi(node.id); }} aria-label={copy.deleteApi} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>\n''',
    '''                      <button type="button" data-testid={`architecture-api-edit-${node.id}`} onClick={() => { const nextName = window.prompt(copy.apiName, node.name); if (nextName === null) return; const nextPath = window.prompt(copy.apiPath, node.path); if (nextPath !== null) onUpdateApi(node.id, { name: nextName, path: nextPath }); }} aria-label={copy.editApi} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>\n                      <button type="button" data-testid={`architecture-api-duplicate-${node.id}`} onClick={() => onDuplicateNode({ kind: "api", id: node.id })} aria-label={copy.duplicateNode} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="content_copy" size={18} /></button>\n                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDeleteApi)) onDeleteApi(node.id); }} aria-label={copy.deleteApi} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>\n''',
    "api duplicate control",
)

text = replace_once(
    text,
    '''                    {edge.label && <span style={{ fontSize: 12, color: p.onSurfaceVariant }}>· {edge.label}</span>}\n                    <button type="button" onClick={() => onDeleteEdge(edge.id)} aria-label={copy.deleteLink} className="m3-press" style={{ marginLeft: "auto", width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: p.error, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="link_off" size={18} /></button>\n''',
    '''                    {edge.label && <span style={{ fontSize: 12, color: p.onSurfaceVariant }}>· {edge.label}</span>}\n                    <button type="button" data-testid={`architecture-edit-edge-${edge.id}`} onClick={() => { setSelectedEdgeId(edge.id); setConnectMode(false); setGraphSource(null); setHighlightedEndpointKey(null); requestAnimationFrame(() => document.querySelector('[data-testid="architecture-graph-edge-editor"]')?.scrollIntoView({ behavior: "smooth", block: "nearest" })); }} aria-label={copy.editLinkLabel} className="m3-press" style={{ marginLeft: "auto", width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: p.primary, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>\n                    <button type="button" onClick={() => onDeleteEdge(edge.id)} aria-label={copy.deleteLink} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: p.error, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="link_off" size={18} /></button>\n''',
    "edge list edit control",
)
component_path.write_text(text)


# ---------- E2E coverage ----------
e2e_path = Path("e2e/core.e2e.ts")
e2e = e2e_path.read_text()
insert_marker = '\n\ntest("architecture graph viewport controls are view-only", async ({ page }) => {'
new_test = r'''

test("architecture node duplication and edge label editing use normal undo history", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  let architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  let actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" }).first();
  await actionNode.click();
  await architecture.getByTestId("architecture-duplicate-focused-node").click();
  await expect(architecture.getByText("Validate login copy", { exact: true })).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.nodes?.filter((node: { kind?: string }) => node.kind === "action").length ?? 0 : 0;
  })).toBe(2);

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await page.getByTitle("App architecture").click();
  architecture = page.getByTestId("architecture-flow");
  await expect(architecture.getByText("Validate login copy", { exact: true })).toHaveCount(0);

  actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  await architecture.getByTestId("architecture-connect-mode").click();
  await architecture.getByTestId("architecture-graph-node-frame-home").click();
  await actionNode.click();
  await architecture.getByTestId("architecture-connect-mode").click();
  const edge = architecture.locator('[data-testid^="architecture-graph-link-"]').first();
  await edge.click();
  await architecture.getByTestId("architecture-edge-label-editor").fill("submit credentials");
  await architecture.getByTestId("architecture-save-edge-label").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.edges?.[0]?.label ?? "" : "";
  })).toBe("submit credentials");

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    return raw ? JSON.parse(raw).architecture?.edges?.[0]?.label ?? "" : "";
  })).toBe("");
});
'''
if insert_marker not in e2e:
    raise SystemExit("missing E2E insertion marker")
e2e = e2e.replace(insert_marker, new_test + insert_marker, 1)
e2e_path.write_text(e2e)


# ---------- documentation ----------
docs_path = Path("docs/ARCHITECTURE_FLOW.md")
docs = docs_path.read_text()
docs = replace_once(
    docs,
    '''The editor now renders the combined Screen + Action + API model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action and API nodes are persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology. Node-name search and Screen/Action/API kind filtering dim non-matching nodes without changing the deterministic layout or persisted document; clicking a node outside connect mode provides a transient focus highlight. View-only zoom controls support incremental zoom and Fit to view; clicking or diagnostically focusing a node centers it in the graph viewport without persisting viewport state. Focusing a node also traces every valid transitive upstream/downstream semantic relation, visually distinguishes the two directions, and dims unrelated branches; this relation focus is derived at runtime and never stored in the project.\n''',
    '''The editor now renders the combined Screen + Action + API model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action and API nodes are persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. A focused Action/API can jump to its detailed editor or be duplicated; duplication copies only node metadata and deliberately does not copy semantic links. Selecting an edge exposes its optional label for edit/clear, and the lower link list can jump to the same edge editor. Graph coordinates are still UI-only and are recalculated from the current topology. Node-name search and Screen/Action/API kind filtering dim non-matching nodes without changing the deterministic layout or persisted document; clicking a node outside connect mode provides a transient focus highlight. View-only zoom controls support incremental zoom and Fit to view; clicking or diagnostically focusing a node centers it in the graph viewport without persisting viewport state. Focusing a node also traces every valid transitive upstream/downstream semantic relation, visually distinguishes the two directions, and dims unrelated branches; this relation focus is derived at runtime and never stored in the project.\n''',
    "architecture visual graph docs",
)
docs = replace_once(
    docs,
    '''The editor exposes **App architecture** on desktop and from the mobile Screens sheet. Action/link mutations:\n''',
    '''The editor exposes **App architecture** on desktop and from the mobile Screens sheet. Action/API duplication, node edits, link-label edits, and other Action/link mutations:\n''',
    "architecture persistence docs",
)
docs_path.write_text(docs)


todo_path = Path("docs/TODO.md")
todo = todo_path.read_text()
todo = replace_once(
    todo,
    '''- [x] Trace transitive upstream/downstream relations from a focused Architecture node and dim unrelated branches without mutating project data.\n- [ ] Evaluate an `agent` or `database` architecture node only after real projects demonstrate the need; do not add execution semantics by default.\n''',
    '''- [x] Trace transitive upstream/downstream relations from a focused Architecture node and dim unrelated branches without mutating project data.\n- [x] Improve Architecture Flow editing with focused-node edit handoff, Action/API duplication, and edge-label editing through normal Undo/Redo.\n- [ ] Evaluate an `agent` or `database` architecture node only after real projects demonstrate the need; do not add execution semantics by default.\n''',
    "architecture editing todo",
)
todo_path.write_text(todo)
