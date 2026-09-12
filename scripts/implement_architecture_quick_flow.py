from pathlib import Path

root = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (root / path).read_text()

def write(path: str, text: str) -> None:
    (root / path).write_text(text)

# 1) Add one atomic, testable command for Screen -> Action -> API -> optional Screen.
path = "lib/architecture-flow.ts"
text = read(path)
anchor = "export function updateArchitectureApi(\n"
insert = '''export type ArchitectureQuickFlowInput = {\n  sourceFrameId: string;\n  targetFrameId?: string;\n  action: Pick<ArchitectureActionNode, \"id\" | \"name\">;\n  api: Pick<ArchitectureApiNode, \"id\" | \"name\" | \"method\" | \"path\">;\n  edgeIds: {\n    sourceToAction: string;\n    actionToApi: string;\n    apiToTarget?: string;\n  };\n};\n\n/**\n * Create a common semantic app flow in one immutable document command. The optional\n * final Screen is descriptive architecture only; this never writes navigation fields.\n * Validation happens up front so a bad draft cannot partially mutate the flow.\n */\nexport function createArchitectureQuickFlow(\n  flow: ArchitectureFlow,\n  frames: readonly Frame[],\n  input: ArchitectureQuickFlowInput,\n): ArchitectureFlow {\n  const sourceFrameId = input.sourceFrameId.trim();\n  const targetFrameId = input.targetFrameId?.trim() || undefined;\n  const actionId = input.action.id.trim();\n  const actionName = input.action.name.trim();\n  const apiId = input.api.id.trim();\n  const apiName = input.api.name.trim();\n  const apiPath = input.api.path.trim();\n  const edgeIds = [input.edgeIds.sourceToAction, input.edgeIds.actionToApi, ...(targetFrameId ? [input.edgeIds.apiToTarget ?? \"\"] : [])].map((id) => id.trim());\n\n  if (!sourceFrameId || !frames.some((frame) => frame.id === sourceFrameId)) return flow;\n  if (targetFrameId && !frames.some((frame) => frame.id === targetFrameId)) return flow;\n  if (!actionId || !actionName || !apiId || !apiName || !apiPath || actionId === apiId) return flow;\n  if (flow.nodes.some((node) => node.id === actionId || node.id === apiId)) return flow;\n  if (edgeIds.some((id) => !id) || new Set(edgeIds).size !== edgeIds.length) return flow;\n  if (edgeIds.some((id) => flow.edges.some((edge) => edge.id === id))) return flow;\n\n  let next = addArchitectureAction(flow, { id: actionId, kind: \"action\", name: actionName });\n  next = addArchitectureApi(next, { id: apiId, kind: \"api\", name: apiName, method: input.api.method, path: apiPath });\n  next = connectArchitectureNodes(\n    next,\n    { id: edgeIds[0], from: { kind: \"frame\", id: sourceFrameId }, to: { kind: \"action\", id: actionId } },\n    frames,\n  );\n  next = connectArchitectureNodes(\n    next,\n    { id: edgeIds[1], from: { kind: \"action\", id: actionId }, to: { kind: \"api\", id: apiId } },\n    frames,\n  );\n  if (targetFrameId) {\n    next = connectArchitectureNodes(\n      next,\n      { id: edgeIds[2], from: { kind: \"api\", id: apiId }, to: { kind: \"frame\", id: targetFrameId } },\n      frames,\n    );\n  }\n  return next;\n}\n\n'''
if anchor not in text:
    raise SystemExit("architecture helper anchor not found")
text = text.replace(anchor, insert + anchor, 1)
write(path, text)

# 2) Unit tests for atomic creation and upfront validation.
path = "lib/architecture-flow.test.ts"
text = read(path)
text = text.replace("  connectArchitectureNodes,\n", "  connectArchitectureNodes,\n  createArchitectureQuickFlow,\n", 1)
anchor = '  it("duplicates semantic nodes without duplicating their connections", () => {\n'
test_block = '''  it("creates a Screen to Action to API flow as one semantic command", () => {\n    const quickFrames: Frame[] = [...frames, { id: \"details\", name: \"Details\", x: 500, y: 0 }];\n    const created = createArchitectureQuickFlow(empty(), quickFrames, {\n      sourceFrameId: \"home\",\n      targetFrameId: \"details\",\n      action: { id: \"load\", name: \" Load details \" },\n      api: { id: \"details-api\", name: \" Details API \", method: \"GET\", path: \" /api/details \" },\n      edgeIds: { sourceToAction: \"e1\", actionToApi: \"e2\", apiToTarget: \"e3\" },\n    });\n\n    expect(created.nodes).toEqual([\n      { id: \"load\", kind: \"action\", name: \"Load details\" },\n      { id: \"details-api\", kind: \"api\", name: \"Details API\", method: \"GET\", path: \"/api/details\" },\n    ]);\n    expect(created.edges).toEqual([\n      { id: \"e1\", from: { kind: \"frame\", id: \"home\" }, to: { kind: \"action\", id: \"load\" } },\n      { id: \"e2\", from: { kind: \"action\", id: \"load\" }, to: { kind: \"api\", id: \"details-api\" } },\n      { id: \"e3\", from: { kind: \"api\", id: \"details-api\" }, to: { kind: \"frame\", id: \"details\" } },\n    ]);\n  });\n\n  it("rejects invalid quick-flow drafts before making partial changes", () => {\n    const flow = addArchitectureAction(empty(), { id: \"existing\", kind: \"action\", name: \"Existing\" });\n    const invalid = createArchitectureQuickFlow(flow, frames, {\n      sourceFrameId: \"missing\",\n      action: { id: \"new-action\", name: \"New action\" },\n      api: { id: \"new-api\", name: \"New API\", method: \"POST\", path: \"/api/new\" },\n      edgeIds: { sourceToAction: \"e1\", actionToApi: \"e2\" },\n    });\n    expect(invalid).toBe(flow);\n\n    const collision = createArchitectureQuickFlow(flow, frames, {\n      sourceFrameId: \"home\",\n      action: { id: \"existing\", name: \"Collision\" },\n      api: { id: \"new-api\", name: \"New API\", method: \"POST\", path: \"/api/new\" },\n      edgeIds: { sourceToAction: \"e1\", actionToApi: \"e2\" },\n    });\n    expect(collision).toBe(flow);\n  });\n\n'''
if anchor not in text:
    raise SystemExit("architecture unit test anchor not found")
text = text.replace(anchor, test_block + anchor, 1)
write(path, text)

# 3) Architecture Flow UI: one compact Quick flow form.
path = "components/ArchitectureFlow.tsx"
text = read(path)
text = text.replace("  onAddApi,\n  onUpdateApi,", "  onAddApi,\n  onCreateQuickFlow,\n  onUpdateApi,", 1)
text = text.replace(
    "  onAddApi: (name: string, method: ArchitectureHttpMethod, path: string) => void;\n  onUpdateApi:",
    "  onAddApi: (name: string, method: ArchitectureHttpMethod, path: string) => void;\n  onCreateQuickFlow: (draft: { sourceFrameId: string; targetFrameId?: string; actionName: string; apiName: string; apiMethod: ArchitectureHttpMethod; apiPath: string }) => void;\n  onUpdateApi:",
    1,
)
copy_anchor = '    apis: "APIs",\n'
copy_insert = '''    quickFlow: lang === "ja" ? "Quick flow" : "Quick flow",\n    quickFlowHint: lang === "ja" ? "Screen → Action → API → 次のScreenをまとめて作成します。次のScreenは任意です。画面遷移は変更しません。" : "Create Screen → Action → API → next Screen in one step. The final Screen is optional and navigation is unchanged.",\n    quickSource: lang === "ja" ? "開始Screen" : "Start Screen",\n    quickTarget: lang === "ja" ? "次のScreen（任意）" : "Next Screen (optional)",\n    quickNoTarget: lang === "ja" ? "次のScreenなし" : "No next Screen",\n    quickCreate: lang === "ja" ? "フローを作成" : "Create flow",\n'''
if copy_anchor not in text:
    raise SystemExit("architecture copy anchor not found")
text = text.replace(copy_anchor, copy_anchor + copy_insert, 1)
state_anchor = '  const [apiPath, setApiPath] = useState("");\n'
state_insert = '''  const [quickSourceFrameId, setQuickSourceFrameId] = useState(frames[0]?.id ?? "");\n  const [quickTargetFrameId, setQuickTargetFrameId] = useState("");\n  const [quickActionName, setQuickActionName] = useState("");\n  const [quickApiName, setQuickApiName] = useState("");\n  const [quickApiMethod, setQuickApiMethod] = useState<ArchitectureHttpMethod>("GET");\n  const [quickApiPath, setQuickApiPath] = useState("");\n'''
if state_anchor not in text:
    raise SystemExit("architecture state anchor not found")
text = text.replace(state_anchor, state_anchor + state_insert, 1)
function_anchor = '''  const addLink = () => {\n'''
function_insert = '''  const createQuickFlow = () => {\n    const actionName = quickActionName.trim();\n    const apiName = quickApiName.trim();\n    const apiPath = quickApiPath.trim();\n    if (!quickSourceFrameId || !actionName || !apiName || !apiPath) return;\n    onCreateQuickFlow({\n      sourceFrameId: quickSourceFrameId,\n      targetFrameId: quickTargetFrameId || undefined,\n      actionName,\n      apiName,\n      apiMethod: quickApiMethod,\n      apiPath,\n    });\n    setQuickActionName("");\n    setQuickApiName("");\n    setQuickApiPath("");\n  };\n\n'''
if function_anchor not in text:
    raise SystemExit("architecture quick flow function anchor not found")
text = text.replace(function_anchor, function_insert + function_anchor, 1)
# Keep frame selections valid if screens are deleted while the dialog is open.
effect_anchor = '  const options = useMemo(() => architectureEndpointOptions(frames, flow), [frames, flow]);\n'
effect_insert = '''  useEffect(() => {\n    if (!frames.some((frame) => frame.id === quickSourceFrameId)) setQuickSourceFrameId(frames[0]?.id ?? "");\n    if (quickTargetFrameId && !frames.some((frame) => frame.id === quickTargetFrameId)) setQuickTargetFrameId("");\n  }, [frames, quickSourceFrameId, quickTargetFrameId]);\n\n'''
if effect_anchor not in text:
    raise SystemExit("architecture quick selection effect anchor not found")
text = text.replace(effect_anchor, effect_insert + effect_anchor, 1)
ui_anchor = '''          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14 }}>\n'''
ui_block = '''          <section data-testid="architecture-quick-flow" style={{ border: `1px solid ${p.outlineVariant}`, borderRadius: 20, padding: 14, background: p.surfaceContainerLow }}>\n            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>\n              <span style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: p.primaryContainer, color: p.onPrimaryContainer }}><Icon name="bolt" size={19} /></span>\n              <div style={{ minWidth: 0 }}>\n                <div style={{ fontSize: 13, fontWeight: 900 }}>{copy.quickFlow}</div>\n                <div style={{ marginTop: 2, fontSize: 11, color: p.onSurfaceVariant }}>{copy.quickFlowHint}</div>\n              </div>\n            </div>\n            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 8 }}>\n              <select data-testid="architecture-quick-source" aria-label={copy.quickSource} value={quickSourceFrameId} onChange={(event) => setQuickSourceFrameId(event.target.value)} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}>\n                {frames.map((frame) => <option key={frame.id} value={frame.id}>{frame.name || copy.screens}</option>)}\n              </select>\n              <input data-testid="architecture-quick-action" aria-label={copy.actionName} placeholder={copy.actionName} value={quickActionName} onChange={(event) => setQuickActionName(event.target.value)} style={{ minWidth: 0, height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }} />\n              <select data-testid="architecture-quick-api-method" aria-label="HTTP method" value={quickApiMethod} onChange={(event) => setQuickApiMethod(event.target.value as ArchitectureHttpMethod)} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}>\n                {(["GET", "POST", "PUT", "PATCH", "DELETE"] as ArchitectureHttpMethod[]).map((method) => <option key={method} value={method}>{method}</option>)}\n              </select>\n              <input data-testid="architecture-quick-api-path" aria-label={copy.apiPath} placeholder={copy.apiPath} value={quickApiPath} onChange={(event) => setQuickApiPath(event.target.value)} style={{ minWidth: 0, height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }} />\n              <input data-testid="architecture-quick-api-name" aria-label={copy.apiName} placeholder={copy.apiName} value={quickApiName} onChange={(event) => setQuickApiName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createQuickFlow(); }} style={{ minWidth: 0, height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit" }} />\n              <select data-testid="architecture-quick-target" aria-label={copy.quickTarget} value={quickTargetFrameId} onChange={(event) => setQuickTargetFrameId(event.target.value)} style={{ height: 44, borderRadius: 14, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 10px", font: "inherit" }}>\n                <option value="">{copy.quickNoTarget}</option>\n                {frames.map((frame) => <option key={frame.id} value={frame.id}>{frame.name || copy.screens}</option>)}\n              </select>\n            </div>\n            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>\n              <button type="button" data-testid="architecture-quick-create" onClick={createQuickFlow} disabled={!frames.length || !quickActionName.trim() || !quickApiName.trim() || !quickApiPath.trim()} className="m3-press" style={{ minHeight: 42, border: "none", borderRadius: 21, padding: "0 16px", background: p.primary, color: p.onPrimary, fontWeight: 850, cursor: "pointer", opacity: !frames.length || !quickActionName.trim() || !quickApiName.trim() || !quickApiPath.trim() ? 0.5 : 1 }}>\n                {copy.quickCreate}\n              </button>\n            </div>\n          </section>\n\n'''
if ui_anchor not in text:
    raise SystemExit("architecture quick flow UI anchor not found")
text = text.replace(ui_anchor, ui_block + ui_anchor, 1)
write(path, text)

# 4) Page controller: generate IDs once and commit the complete flow as one Undo entry.
path = "app/page.tsx"
text = read(path)
old_import = 'import { addArchitectureAction, addArchitectureApi, bindArchitectureActionSource, connectArchitectureNodes, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, duplicateArchitectureNode, renameArchitectureAction, updateArchitectureApi, updateArchitectureEdgeLabel } from "@/lib/architecture-flow";'
new_import = 'import { addArchitectureAction, addArchitectureApi, bindArchitectureActionSource, connectArchitectureNodes, createArchitectureQuickFlow, deleteArchitectureAction, deleteArchitectureApi, deleteArchitectureEdge, duplicateArchitectureNode, renameArchitectureAction, updateArchitectureApi, updateArchitectureEdgeLabel } from "@/lib/architecture-flow";'
if old_import not in text:
    raise SystemExit("page architecture import not found")
text = text.replace(old_import, new_import, 1)
callback_anchor = '''  const updateArchitectureApiNode = (id: string, patch: Partial<Pick<ArchitectureApiNode, "name" | "method" | "path">>) =>\n'''
callback_insert = '''  const createArchitectureQuickFlowChain = (draft: { sourceFrameId: string; targetFrameId?: string; actionName: string; apiName: string; apiMethod: ArchitectureHttpMethod; apiPath: string }) => {\n    const actionId = uid();\n    const apiId = uid();\n    const next = createArchitectureQuickFlow(architecture, framesRef.current, {\n      sourceFrameId: draft.sourceFrameId,\n      targetFrameId: draft.targetFrameId,\n      action: { id: actionId, name: draft.actionName },\n      api: { id: apiId, name: draft.apiName, method: draft.apiMethod, path: draft.apiPath },\n      edgeIds: {\n        sourceToAction: uid(),\n        actionToApi: uid(),\n        apiToTarget: draft.targetFrameId ? uid() : undefined,\n      },\n    });\n    if (next === architecture) return;\n    commitArchitecture(next);\n    setArchitectureFocus({ kind: \"action\", id: actionId });\n  };\n'''
if callback_anchor not in text:
    raise SystemExit("page architecture callback anchor not found")
text = text.replace(callback_anchor, callback_insert + callback_anchor, 1)
prop_anchor = '''              onAddApi={addArchitectureApiNode}\n              onUpdateApi={updateArchitectureApiNode}\n'''
prop_replace = '''              onAddApi={addArchitectureApiNode}\n              onCreateQuickFlow={createArchitectureQuickFlowChain}\n              onUpdateApi={updateArchitectureApiNode}\n'''
if prop_anchor not in text:
    raise SystemExit("page ArchitectureFlow props anchor not found")
text = text.replace(prop_anchor, prop_replace, 1)
write(path, text)

# 5) Browser coverage: create the full semantic chain and prove one Undo removes it all.
path = "e2e/core.e2e.ts"
text = read(path)
anchor = 'test("architecture visual graph creates semantic links and participates in undo", async ({ page }) => {\n'
e2e = '''test("architecture Quick flow creates Screen Action API Screen as one undo step", async ({ page }) => {\n  await openSeeded(page);\n  await page.getByTitle("App architecture").click();\n  const architecture = page.getByTestId("architecture-flow");\n\n  await architecture.getByTestId("architecture-quick-source").selectOption("home");\n  await architecture.getByTestId("architecture-quick-action").fill("Load details");\n  await architecture.getByTestId("architecture-quick-api-method").selectOption("GET");\n  await architecture.getByTestId("architecture-quick-api-path").fill("/api/details");\n  await architecture.getByTestId("architecture-quick-api-name").fill("Details API");\n  await architecture.getByTestId("architecture-quick-target").selectOption("details");\n  await architecture.getByTestId("architecture-quick-create").click();\n\n  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Load details" });\n  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Details API" });\n  await expect(actionNode).toHaveCount(1);\n  await expect(apiNode).toHaveCount(1);\n  await expect(actionNode).toBeFocused();\n  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(3);\n\n  await expect.poll(() => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const flow = raw ? JSON.parse(raw).architecture : null;\n    return { nodes: flow?.nodes?.length ?? 0, edges: flow?.edges?.length ?? 0 };\n  })).toEqual({ nodes: 2, edges: 3 });\n\n  await architecture.getByRole("button", { name: "Close", exact: true }).click();\n  await page.getByTitle("Undo").click();\n  await expect.poll(() => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const flow = raw ? JSON.parse(raw).architecture : null;\n    return { nodes: flow?.nodes?.length ?? 0, edges: flow?.edges?.length ?? 0 };\n  })).toEqual({ nodes: 0, edges: 0 });\n});\n\n\n'''
if anchor not in text:
    raise SystemExit("architecture E2E anchor not found")
text = text.replace(anchor, e2e + anchor, 1)
write(path, text)

# 6) Documentation stays aligned with the new shared command and UI.
path = "docs/TODO.md"
text = read(path)
needle = '- [x] Link semantic Actions to Canvas parts with bidirectional Canvas ↔ Architecture handoff, while keeping navigation and execution semantics separate.\n'
replacement = needle + '- [x] Add a one-step Architecture Quick flow creator for `Screen → Action → API → optional Screen`, committed as one Undo operation without changing navigation.\n'
if needle not in text:
    raise SystemExit("TODO architecture anchor not found")
text = text.replace(needle, replacement, 1)
write(path, text)

path = "docs/ROADMAP.md"
text = read(path)
needle = '- Diagnose stale or duplicate Action → Canvas source bindings and route the user to explicit repair instead of silently normalizing them.\n'
replacement = needle + '- Create common `Screen → Action → API → optional Screen` semantic chains from one Quick flow form and one shared document command/Undo step.\n'
if needle not in text:
    raise SystemExit("ROADMAP architecture anchor not found")
text = text.replace(needle, replacement, 1)
write(path, text)

path = "docs/ARCHITECTURE.md"
text = read(path)
needle = '- `lib/navigation-graph-edit.ts` — existing-route editing, trigger discovery, graph-created routes, and transition persistence through existing document fields\n'
replacement = needle + '- `lib/architecture-flow.ts` — semantic Action/API commands, diagnostics/layout, Canvas-source binding, and atomic Quick flow creation\n'
if needle not in text:
    raise SystemExit("ARCHITECTURE boundary anchor not found")
text = text.replace(needle, replacement, 1)
write(path, text)

path = "docs/ARCHITECTURE_FLOW.md"
text = read(path)
needle = 'The editor exposes **App architecture** on desktop and from the mobile Screens sheet. An Action can be associated with one Canvas part from either the desktop or mobile Inspector, opened back in the normal Canvas Inspector, and either Inspector can jump to the same Action in Architecture Flow. Reassigning the same part moves ownership to the newly selected Action; duplicating an Action intentionally does not copy its Canvas binding. Action/API duplication, source binding, node edits, link-label edits, and other Action/link mutations:\n'
replacement = 'The editor exposes **App architecture** on desktop and from the mobile Screens sheet. An Action can be associated with one Canvas part from either the desktop or mobile Inspector, opened back in the normal Canvas Inspector, and either Inspector can jump to the same Action in Architecture Flow. Reassigning the same part moves ownership to the newly selected Action; duplicating an Action intentionally does not copy its Canvas binding. A **Quick flow** form can create `Screen → Action → API → optional Screen` in one shared command and one Undo step; the final Screen remains semantic architecture metadata and never changes Preview/navigation. Action/API duplication, source binding, node edits, link-label edits, Quick flow creation, and other Action/link mutations:\n'
if needle not in text:
    raise SystemExit("ARCHITECTURE_FLOW editing anchor not found")
text = text.replace(needle, replacement, 1)
write(path, text)
