from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"pattern occurs {text.count(old)} times in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# 1) Persist an optional Canvas source on semantic Action nodes.
replace_once(
    "lib/tokens.ts",
    '''export type ArchitectureActionNode = {\n  id: string;\n  kind: "action";\n  name: string;\n  note?: string;\n};''',
    '''export type ArchitectureActionNode = {\n  id: string;\n  kind: "action";\n  name: string;\n  note?: string;\n  /** Optional Canvas Item that starts this semantic action. Design metadata only. */\n  sourceItemId?: string;\n};''',
)

# 2) Explicitly validate the additive source binding in imported projects.
replace_once(
    "lib/project.ts",
    '''  if (value.note !== undefined && typeof value.note !== "string") return false;\n  if (value.kind === "action") return true;\n  return value.kind === "api" &&''',
    '''  if (value.note !== undefined && typeof value.note !== "string") return false;\n  if (value.kind === "action") {\n    return value.sourceItemId === undefined ||\n      (typeof value.sourceItemId === "string" && value.sourceItemId.trim().length > 0);\n  }\n  return value.kind === "api" &&''',
)

# 3) Shared command: bind one Canvas Item to at most one Action. Duplicates intentionally drop the binding.
replace_once(
    "lib/architecture-flow.ts",
    '''export function deleteArchitectureAction(\n  flow: ArchitectureFlow,\n  id: string,\n): ArchitectureFlow {\n  if (!flow.nodes.some((node) => node.id === id)) return flow;\n  return {\n    ...flow,\n    nodes: flow.nodes.filter((node) => node.id !== id),\n    edges: flow.edges.filter(\n      (edge) =>\n        !(edge.from.kind === "action" && edge.from.id === id) &&\n        !(edge.to.kind === "action" && edge.to.id === id),\n    ),\n  };\n}\n''',
    '''export function deleteArchitectureAction(\n  flow: ArchitectureFlow,\n  id: string,\n): ArchitectureFlow {\n  if (!flow.nodes.some((node) => node.id === id)) return flow;\n  return {\n    ...flow,\n    nodes: flow.nodes.filter((node) => node.id !== id),\n    edges: flow.edges.filter(\n      (edge) =>\n        !(edge.from.kind === "action" && edge.from.id === id) &&\n        !(edge.to.kind === "action" && edge.to.id === id),\n    ),\n  };\n}\n\n/**\n * Associate a visual Canvas Item with a semantic Action. One Item can start at most\n * one Action; rebinding it clears the previous Action's source without changing any\n * navigation or execution behavior.\n */\nexport function bindArchitectureActionSource(\n  flow: ArchitectureFlow,\n  id: string,\n  sourceItemId?: string,\n): ArchitectureFlow {\n  const nextSourceItemId = sourceItemId?.trim() || undefined;\n  if (!flow.nodes.some((node) => node.kind === "action" && node.id === id)) return flow;\n\n  let changed = false;\n  const nodes = flow.nodes.map((node) => {\n    if (node.kind !== "action") return node;\n    const nextSource =\n      node.id === id\n        ? nextSourceItemId\n        : nextSourceItemId && node.sourceItemId === nextSourceItemId\n          ? undefined\n          : node.sourceItemId;\n    if (nextSource === node.sourceItemId) return node;\n    changed = true;\n    if (nextSource) return { ...node, sourceItemId: nextSource };\n    const { sourceItemId: _removed, ...rest } = node;\n    return rest;\n  });\n\n  return changed ? { ...flow, nodes } : flow;\n}\n''',
)

replace_once(
    "lib/architecture-flow.ts",
    '''  return {\n    ...flow,\n    // Duplicate only the semantic node. Connections are intentionally not copied,\n    // because duplicating topology would silently invent app behavior.\n    nodes: [...flow.nodes, { ...source, id, name }],\n  };\n}\n''',
    '''  const duplicate = source.kind === "action"\n    ? (() => {\n        const { sourceItemId: _sourceItemId, ...rest } = source;\n        return { ...rest, id, name };\n      })()\n    : { ...source, id, name };\n  return {\n    ...flow,\n    // Duplicate only semantic metadata. Connections and Canvas-source ownership are\n    // intentionally not copied because either would silently invent app behavior.\n    nodes: [...flow.nodes, duplicate],\n  };\n}\n''',
)

# 4) Architecture Flow UI: source selector, Canvas jump, and externally focused Action.
replace_once(
    "components/ArchitectureFlow.tsx",
    '''const endpointTestId = (endpoint: ArchitectureEndpoint) =>\n  `architecture-graph-node-${endpoint.kind}-${endpoint.id}`;\n\nexport function ArchitectureFlowView({''',
    '''const endpointTestId = (endpoint: ArchitectureEndpoint) =>\n  `architecture-graph-node-${endpoint.kind}-${endpoint.id}`;\n\nexport type ArchitectureCanvasItemOption = {\n  id: string;\n  label: string;\n  screenName?: string;\n};\n\nexport function ArchitectureFlowView({''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''  flow,\n  frames,\n  palette: p,\n  onClose,''',
    '''  flow,\n  frames,\n  canvasItems,\n  focusEndpoint,\n  palette: p,\n  onClose,''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''  onDuplicateNode,\n  onConnect,\n  onUpdateEdgeLabel,\n  onDeleteEdge,\n}: {\n  flow: ArchitectureFlow;\n  frames: Frame[];\n  palette: Palette;''',
    '''  onDuplicateNode,\n  onBindActionSource,\n  onOpenCanvasItem,\n  onConnect,\n  onUpdateEdgeLabel,\n  onDeleteEdge,\n}: {\n  flow: ArchitectureFlow;\n  frames: Frame[];\n  canvasItems: ArchitectureCanvasItemOption[];\n  focusEndpoint?: ArchitectureEndpoint | null;\n  palette: Palette;''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''  onDeleteApi: (id: string) => void;\n  onDuplicateNode: (endpoint: ArchitectureEndpoint) => void;\n  onConnect: (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) => void;''',
    '''  onDeleteApi: (id: string) => void;\n  onDuplicateNode: (endpoint: ArchitectureEndpoint) => void;\n  onBindActionSource: (id: string, sourceItemId?: string) => void;\n  onOpenCanvasItem: (itemId: string) => void;\n  onConnect: (from: ArchitectureEndpoint, to: ArchitectureEndpoint, label: string) => void;''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''    rename: lang === "ja" ? "Action名を変更" : "Rename Action",\n    deleteAction: lang === "ja" ? "Actionを削除" : "Delete Action",\n    source: lang === "ja" ? "開始" : "From",''',
    '''    rename: lang === "ja" ? "Action名を変更" : "Rename Action",\n    deleteAction: lang === "ja" ? "Actionを削除" : "Delete Action",\n    canvasSource: lang === "ja" ? "Canvasの部品" : "Canvas source",\n    canvasSourceNone: lang === "ja" ? "部品と未接続" : "Not linked to a part",\n    openCanvasSource: lang === "ja" ? "Canvasで開く" : "Open in Canvas",\n    missingCanvasSource: lang === "ja" ? "部品が見つかりません" : "Canvas part is missing",\n    source: lang === "ja" ? "開始" : "From",''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''  const actionNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "action"), [flow.nodes]);\n  const apiNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "api"), [flow.nodes]);''',
    '''  const actionNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "action"), [flow.nodes]);\n  const apiNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "api"), [flow.nodes]);\n  const canvasItemsById = useMemo(() => new Map(canvasItems.map((item) => [item.id, item])), [canvasItems]);''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''    element?.focus({ preventScroll: true });\n  };\n\n  const changeGraphZoom = (direction: -1 | 1) => {''',
    '''    element?.focus({ preventScroll: true });\n  };\n\n  useEffect(() => {\n    if (!focusEndpoint) return;\n    const key = architectureEndpointKey(focusEndpoint);\n    if (!graphNodes.has(key)) return;\n    setGraphQuery("");\n    setGraphKindFilter("all");\n    setConnectMode(false);\n    setGraphSource(null);\n    setSelectedEdgeId(null);\n    setHighlightedEndpointKey(key);\n    requestAnimationFrame(() => focusGraphNode(focusEndpoint, "auto"));\n  }, [focusEndpoint?.kind, focusEndpoint?.id]);\n\n  const changeGraphZoom = (direction: -1 | 1) => {''',
)

old_action_card = '''                {actionNodes.map((node) => (\n                  <div key={node.id} data-testid={`architecture-action-${node.id}`} style={card(p.secondaryContainer, p.onSecondaryContainer)}>\n                    <div style={{ fontSize: 10, fontWeight: 900, color: p.primary }}>{copy.actionBadge}</div>\n                    <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>\n                      <div style={{ flex: 1, minWidth: 0, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</div>\n                      <button type="button" data-testid={`architecture-action-edit-${node.id}`} onClick={() => { const next = window.prompt(copy.rename, node.name); if (next !== null) onRenameAction(node.id, next); }} aria-label={copy.rename} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>\n                      <button type="button" data-testid={`architecture-action-duplicate-${node.id}`} onClick={() => onDuplicateNode({ kind: "action", id: node.id })} aria-label={copy.duplicateNode} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="content_copy" size={18} /></button>\n                      <button type="button" onClick={() => { if (window.confirm(copy.confirmDelete)) onDeleteAction(node.id); }} aria-label={copy.deleteAction} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>\n                    </div>\n                  </div>\n                ))}'''
new_action_card = '''                {actionNodes.map((node) => {\n                  const sourceItem = node.sourceItemId ? canvasItemsById.get(node.sourceItemId) : undefined;\n                  return (\n                    <div key={node.id} data-testid={`architecture-action-${node.id}`} style={card(p.secondaryContainer, p.onSecondaryContainer)}>\n                      <div style={{ fontSize: 10, fontWeight: 900, color: p.primary }}>{copy.actionBadge}</div>\n                      <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>\n                        <div style={{ flex: 1, minWidth: 0, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</div>\n                        <button type="button" data-testid={`architecture-action-edit-${node.id}`} onClick={() => { const next = window.prompt(copy.rename, node.name); if (next !== null) onRenameAction(node.id, next); }} aria-label={copy.rename} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="edit" size={18} /></button>\n                        <button type="button" data-testid={`architecture-action-duplicate-${node.id}`} onClick={() => onDuplicateNode({ kind: "action", id: node.id })} aria-label={copy.duplicateNode} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: "transparent", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="content_copy" size={18} /></button>\n                        <button type="button" onClick={() => { if (window.confirm(copy.confirmDelete)) onDeleteAction(node.id); }} aria-label={copy.deleteAction} className="m3-press" style={{ width: 36, height: 36, border: "none", borderRadius: 18, background: p.errorContainer, color: p.onErrorContainer, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="delete" size={18} /></button>\n                      </div>\n                      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 7, alignItems: "center" }}>\n                        <select\n                          data-testid={`architecture-action-source-${node.id}`}\n                          aria-label={`${copy.canvasSource}: ${node.name}`}\n                          value={node.sourceItemId ?? ""}\n                          onChange={(event) => onBindActionSource(node.id, event.target.value || undefined)}\n                          style={{ minWidth: 0, height: 38, borderRadius: 12, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 9px", font: "inherit" }}\n                        >\n                          <option value="">{copy.canvasSourceNone}</option>\n                          {node.sourceItemId && !sourceItem && <option value={node.sourceItemId}>{copy.missingCanvasSource} · {node.sourceItemId}</option>}\n                          {canvasItems.map((item) => (\n                            <option key={item.id} value={item.id}>{item.screenName ? `${item.screenName} · ` : ""}{item.label}</option>\n                          ))}\n                        </select>\n                        <button\n                          type="button"\n                          data-testid={`architecture-action-open-source-${node.id}`}\n                          onClick={() => sourceItem && onOpenCanvasItem(sourceItem.id)}\n                          disabled={!sourceItem}\n                          className="m3-press"\n                          style={{ height: 38, border: "none", borderRadius: 19, padding: "0 11px", background: sourceItem ? p.primaryContainer : p.surfaceContainerHigh, color: sourceItem ? p.onPrimaryContainer : p.outline, fontWeight: 800, cursor: sourceItem ? "pointer" : "default", opacity: sourceItem ? 1 : 0.7, whiteSpace: "nowrap" }}\n                        >\n                          {sourceItem ? copy.openCanvasSource : copy.missingCanvasSource}\n                        </button>\n                      </div>\n                    </div>\n                  );\n                })}'''
replace_once("components/ArchitectureFlow.tsx", old_action_card, new_action_card)

# 5) Inspector shows the selected part's semantic Action and can jump back to Architecture Flow.
replace_once(
    "components/Inspector.tsx",
    '''  Action,\n  BACK_TARGET,''',
    '''  Action,\n  ArchitectureActionNode,\n  BACK_TARGET,''',
)

replace_once(
    "components/Inspector.tsx",
    '''  onGroup,\n  onUngroup,\n}: {''',
    '''  onGroup,\n  onUngroup,\n  architectureActions = [],\n  onBindArchitectureAction,\n  onOpenArchitectureAction,\n}: {''',
)

replace_once(
    "components/Inspector.tsx",
    '''  onGroup?: () => void;\n  onUngroup?: () => void;\n}) {''',
    '''  onGroup?: () => void;\n  onUngroup?: () => void;\n  /** Semantic Actions are optional design metadata and never replace Item.action navigation. */\n  architectureActions?: ArchitectureActionNode[];\n  onBindArchitectureAction?: (actionId: string | null) => void;\n  onOpenArchitectureAction?: (actionId: string) => void;\n}) {''',
)

replace_once(
    "components/Inspector.tsx",
    '''  const spec = KIND_SPEC[item.kind];\n  const frameSize = frame ? frameSizeOf(frame) : { w: PHONE_W, h: PHONE_H };''',
    '''  const spec = KIND_SPEC[item.kind];\n  const boundArchitectureAction = architectureActions.find((action) => action.sourceItemId === item.id);\n  const architectureTitle = lang === "ja" ? "Architecture Action" : "Architecture Action";\n  const architectureNone = lang === "ja" ? "Actionと未接続" : "Not linked to an Action";\n  const architectureOpen = lang === "ja" ? "Architecture Flowで開く" : "Open in Architecture Flow";\n  const architectureHint = lang === "ja"\n    ? "この部品から始まる意味上の処理を関連付けます。画面遷移の設定は変更しません。"\n    : "Associate the semantic process started by this part. This does not change navigation.";\n  const frameSize = frame ? frameSizeOf(frame) : { w: PHONE_W, h: PHONE_H };''',
)

replace_once(
    "components/Inspector.tsx",
    '''      </div>\n\n      {TOGGLEABLE.includes(item.kind) && (''',
    '''      </div>\n\n      {onBindArchitectureAction && (\n        <Section id="architecture-action" icon="schema" title={architectureTitle} p={p}>\n          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>\n            <select\n              data-testid="inspector-architecture-action"\n              aria-label={architectureTitle}\n              value={boundArchitectureAction?.id ?? ""}\n              onChange={(event) => onBindArchitectureAction(event.target.value || null)}\n              style={{ width: "100%", height: 42, borderRadius: 13, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}\n            >\n              <option value="">{architectureNone}</option>\n              {architectureActions.map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}\n            </select>\n            {boundArchitectureAction && onOpenArchitectureAction && (\n              <button\n                type="button"\n                data-testid="inspector-open-architecture-action"\n                onClick={() => onOpenArchitectureAction(boundArchitectureAction.id)}\n                className="m3-press"\n                style={{ height: 40, border: "none", borderRadius: 20, background: p.secondaryContainer, color: p.onSecondaryContainer, fontWeight: 700, cursor: "pointer" }}\n              >\n                {architectureOpen}\n              </button>\n            )}\n            <div style={{ fontSize: 11, lineHeight: 1.5, color: p.onSurfaceVariant }}>{architectureHint}</div>\n          </div>\n        </Section>\n      )}\n\n      {TOGGLEABLE.includes(item.kind) && (''',
)

# 6) Controller wiring: shared Undo/Redo, Canvas selection/focus, and external Architecture focus.
replace_once(
    "app/page.tsx",
    '''  Action,\n  ArchitectureApiNode,''',
    '''  Action,\n  ArchitectureActionNode,\n  ArchitectureApiNode,''',
)

replace_once(
    "app/page.tsx",
    '''import { addArchitectureAction, addArchitectureApi, connectArchitectureNodes, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, duplicateArchitectureNode, renameArchitectureAction, updateArchitectureApi, updateArchitectureEdgeLabel } from "@/lib/architecture-flow";''',
    '''import { addArchitectureAction, addArchitectureApi, bindArchitectureActionSource, connectArchitectureNodes, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, duplicateArchitectureNode, renameArchitectureAction, updateArchitectureApi, updateArchitectureEdgeLabel } from "@/lib/architecture-flow";''',
)

replace_once(
    "app/page.tsx",
    '''  const [graphOpen, setGraphOpen] = useState(false);\n  const [architectureOpen, setArchitectureOpen] = useState(false);\n  const [projectManagerOpen, setProjectManagerOpen] = useState(false);''',
    '''  const [graphOpen, setGraphOpen] = useState(false);\n  const [architectureOpen, setArchitectureOpen] = useState(false);\n  const [architectureFocus, setArchitectureFocus] = useState<ArchitectureEndpoint | null>(null);\n  const [projectManagerOpen, setProjectManagerOpen] = useState(false);''',
)

replace_once(
    "app/page.tsx",
    '''  const removeArchitectureEdge = (id: string) =>\n    commitArchitecture(deleteArchitectureEdge(architecture, id));\n\n  /* ---------- render ---------- */''',
    '''  const removeArchitectureEdge = (id: string) =>\n    commitArchitecture(deleteArchitectureEdge(architecture, id));\n  const bindArchitectureActionNodeSource = (id: string, sourceItemId?: string) =>\n    commitArchitecture(bindArchitectureActionSource(architecture, id, sourceItemId));\n  const architectureActionNodes = useMemo(\n    () => architecture.nodes.filter((node): node is ArchitectureActionNode => node.kind === "action"),\n    [architecture.nodes],\n  );\n  const architectureCanvasItems = useMemo(\n    () => groups.flatMap((group) => {\n      const owningFrame = frameOfGroup(group, frames, widths);\n      return group.items.map((item) => ({\n        id: item.id,\n        label: item.label.trim() || KIND_TEXT[lang][item.kind]?.noun || KIND_SPEC[item.kind].label,\n        screenName: owningFrame?.name || undefined,\n      }));\n    }),\n    [groups, frames, widths, lang],\n  );\n  const openCanvasItemFromArchitecture = (itemId: string) => {\n    const group = groupsRef.current.find((candidate) => candidate.items.some((item) => item.id === itemId));\n    if (!group) return;\n    const owningFrame = frameOfGroup(group, framesRef.current, widthsRef.current);\n    setArchitectureOpen(false);\n    setArchitectureFocus(null);\n    setSelectedIds([itemId]);\n    setSelectedFrameId(null);\n    setSelectedLinkId(null);\n    setRightTab("edit");\n    if (mobileRef.current) setSheet("edit");\n    else setRightOpen(true);\n    if (owningFrame) {\n      setLayersFrameId(owningFrame.id);\n      focusFrame(owningFrame.id);\n    }\n  };\n  const bindSelectedArchitectureAction = (actionId: string | null) => {\n    if (!selected) return;\n    if (!actionId) {\n      const current = architectureActionNodes.find((action) => action.sourceItemId === selected.id);\n      if (current) commitArchitecture(bindArchitectureActionSource(architecture, current.id, undefined));\n      return;\n    }\n    commitArchitecture(bindArchitectureActionSource(architecture, actionId, selected.id));\n  };\n  const openArchitectureActionFromInspector = (actionId: string) => {\n    setArchitectureFocus({ kind: "action", id: actionId });\n    setArchitectureOpen(true);\n    if (mobileRef.current) setSheet(null);\n  };\n\n  /* ---------- render ---------- */''',
)

replace_once(
    "app/page.tsx",
    '''                  grouped={!!selectedGroup}\n                  onGroup={groupSelected}\n                  onUngroup={ungroupSelected}\n                />''',
    '''                  grouped={!!selectedGroup}\n                  onGroup={groupSelected}\n                  onUngroup={ungroupSelected}\n                  architectureActions={architectureActionNodes}\n                  onBindArchitectureAction={bindSelectedArchitectureAction}\n                  onOpenArchitectureAction={openArchitectureActionFromInspector}\n                />''',
)

replace_once(
    "app/page.tsx",
    '''            <ArchitectureFlowView\n              flow={architecture}\n              frames={frames}\n              palette={p}\n              onClose={() => setArchitectureOpen(false)}\n              onAddAction={addArchitectureActionNode}''',
    '''            <ArchitectureFlowView\n              flow={architecture}\n              frames={frames}\n              canvasItems={architectureCanvasItems}\n              focusEndpoint={architectureFocus}\n              palette={p}\n              onClose={() => { setArchitectureOpen(false); setArchitectureFocus(null); }}\n              onAddAction={addArchitectureActionNode}''',
)

replace_once(
    "app/page.tsx",
    '''              onDeleteApi={deleteArchitectureApiNode}\n              onDuplicateNode={duplicateArchitectureSemanticNode}\n              onConnect={connectArchitecture}''',
    '''              onDeleteApi={deleteArchitectureApiNode}\n              onDuplicateNode={duplicateArchitectureSemanticNode}\n              onBindActionSource={bindArchitectureActionNodeSource}\n              onOpenCanvasItem={openCanvasItemFromArchitecture}\n              onConnect={connectArchitecture}''',
)

# 7) Unit coverage.
replace_once(
    "lib/architecture-flow.test.ts",
    '''  architectureEndpointOptions,\n  connectArchitectureNodes,''',
    '''  architectureEndpointOptions,\n  bindArchitectureActionSource,\n  connectArchitectureNodes,''',
)

replace_once(
    "lib/architecture-flow.test.ts",
    '''        { id: "validate", kind: "action", name: "Validate", note: "check credentials" },''',
    '''        { id: "validate", kind: "action", name: "Validate", note: "check credentials", sourceItemId: "login-button" },''',
)

replace_once(
    "lib/architecture-flow.test.ts",
    '''    expect(actionCopy.nodes).toContainEqual({ id: "validate-copy", kind: "action", name: "Validate copy", note: "check credentials" });\n    expect(actionCopy.edges).toEqual(flow.edges);''',
    '''    expect(actionCopy.nodes).toContainEqual({ id: "validate-copy", kind: "action", name: "Validate copy", note: "check credentials" });\n    expect(actionCopy.nodes.find((node) => node.id === "validate-copy")).not.toHaveProperty("sourceItemId");\n    expect(actionCopy.edges).toEqual(flow.edges);''',
)

replace_once(
    "lib/architecture-flow.test.ts",
    '''  it("updates and clears a semantic link label without changing its endpoints", () => {''',
    '''  it("binds a Canvas item to one Action at a time and can clear the binding", () => {\n    const flow: ArchitectureFlow = {\n      version: 1,\n      nodes: [\n        { id: "first", kind: "action", name: "First" },\n        { id: "second", kind: "action", name: "Second" },\n      ],\n      edges: [],\n    };\n    const first = bindArchitectureActionSource(flow, "first", " button-1 ");\n    expect(first.nodes[0]).toMatchObject({ id: "first", sourceItemId: "button-1" });\n    const reassigned = bindArchitectureActionSource(first, "second", "button-1");\n    expect(reassigned.nodes[0]).not.toHaveProperty("sourceItemId");\n    expect(reassigned.nodes[1]).toMatchObject({ id: "second", sourceItemId: "button-1" });\n    const cleared = bindArchitectureActionSource(reassigned, "second", undefined);\n    expect(cleared.nodes[1]).not.toHaveProperty("sourceItemId");\n  });\n\n  it("updates and clears a semantic link label without changing its endpoints", () => {''',
)

# 8) E2E: bind in Architecture Flow -> open Canvas/Inspector -> focus same Action -> Undo binding.
e2e = Path("e2e/core.e2e.ts")
text = e2e.read_text()
anchor = '''test("architecture visual graph creates semantic links and participates in undo", async ({ page }) => {'''
if anchor not in text:
    raise SystemExit("E2E anchor missing")
new_test = r'''test("architecture Actions bind to Canvas parts and round-trip through the Inspector", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  let architecture = page.getByTestId("architecture-flow");
  await architecture.getByTestId("architecture-action-name").fill("Open details");
  await architecture.getByTestId("architecture-add-action").click();

  const actionId = await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { kind?: string; name?: string }) => item.kind === "action" && item.name === "Open details") : null;
    return node?.id ?? "";
  })).not.toBe("");
  const storedActionId = await page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { kind?: string; name?: string }) => item.kind === "action" && item.name === "Open details") : null;
    return node?.id as string;
  });

  await architecture.getByTestId(`architecture-action-source-${storedActionId}`).selectOption("go-details");
  await expect.poll(() => page.evaluate((id) => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { id?: string }) => item.id === id) : null;
    return node?.sourceItemId ?? "";
  }, storedActionId)).toBe("go-details");

  await architecture.getByTestId(`architecture-action-open-source-${storedActionId}`).click();
  await expect(architecture).toBeHidden();
  const inspectorAction = page.getByTestId("inspector-architecture-action");
  await expect(inspectorAction).toHaveValue(storedActionId);
  await expect(inspectorAction.locator(`option[value="${storedActionId}"]`)).toHaveText("Open details");

  await page.getByTestId("inspector-open-architecture-action").click();
  architecture = page.getByTestId("architecture-flow");
  await expect(architecture).toBeVisible();
  await expect(architecture.getByTestId(`architecture-graph-node-action-${storedActionId}`)).toBeFocused();

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate((id) => {
    const raw = localStorage.getItem("m3e:doc");
    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { id?: string }) => item.id === id) : null;
    return node?.sourceItemId ?? "";
  }, storedActionId)).toBe("");
});


'''
# Remove an accidental unused expect.poll assignment if TypeScript would reject it: use polling only for readiness.
new_test = new_test.replace('''  const actionId = await expect.poll(async () => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { kind?: string; name?: string }) => item.kind === "action" && item.name === "Open details") : null;\n    return node?.id ?? "";\n  })).not.toBe("");\n''', '''  await expect.poll(async () => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const node = raw ? JSON.parse(raw).architecture?.nodes?.find((item: { kind?: string; name?: string }) => item.kind === "action" && item.name === "Open details") : null;\n    return node?.id ?? "";\n  })).not.toBe("");\n''')
text = text.replace(anchor, new_test + anchor, 1)
e2e.write_text(text)

# 9) Documentation/status.
replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''- Persisted semantic node kinds are `action` and design-only `api`.\n- Architecture links are descriptive today; they do **not** change Preview navigation or invent hidden UI behavior.''',
    '''- Persisted semantic node kinds are `action` and design-only `api`.\n- An Action may optionally store `sourceItemId`, linking it to the Canvas part that starts that semantic process. The binding is design metadata only and does not replace `Item.action` navigation.\n- Architecture links are descriptive today; they do **not** change Preview navigation or invent hidden UI behavior.''',
)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''The editor exposes **App architecture** on desktop and from the mobile Screens sheet. Action/API duplication, node edits, link-label edits, and other Action/link mutations:''',
    '''The editor exposes **App architecture** on desktop and from the mobile Screens sheet. An Action can be associated with one Canvas part, opened back in the normal Canvas Inspector, and the Inspector can jump to the same Action in Architecture Flow. Reassigning the same part moves ownership to the newly selected Action; duplicating an Action intentionally does not copy its Canvas binding. Action/API duplication, source binding, node edits, link-label edits, and other Action/link mutations:''',
)

replace_once(
    "docs/TODO.md",
    '''- [x] Improve Architecture Flow editing with focused-node edit handoff, Action/API duplication, and edge-label editing through normal Undo/Redo.\n- [ ] Evaluate an `agent` or `database` architecture node only after real projects demonstrate the need; do not add execution semantics by default.''',
    '''- [x] Improve Architecture Flow editing with focused-node edit handoff, Action/API duplication, and edge-label editing through normal Undo/Redo.\n- [x] Link semantic Actions to Canvas parts with bidirectional Canvas ↔ Architecture handoff, while keeping navigation and execution semantics separate.\n- [ ] Evaluate an `agent` or `database` architecture node only after real projects demonstrate the need; do not add execution semantics by default.''',
)

replace_once(
    "docs/TODO.md",
    '''- [x] Add E2E coverage for navigation-graph diagnostic jumps without document mutation.\n- [x] Add project format/version migration strategy before the `Doc` schema changes substantially.''',
    '''- [x] Add E2E coverage for navigation-graph diagnostic jumps without document mutation.\n- [x] Add E2E coverage for Architecture Action ↔ Canvas-part binding, source location, focused return, persistence, and Undo.\n- [x] Add project format/version migration strategy before the `Doc` schema changes substantially.''',
)

print("architecture canvas binding patch applied")
