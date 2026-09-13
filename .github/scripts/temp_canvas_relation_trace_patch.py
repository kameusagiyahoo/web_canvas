from pathlib import Path


def replace_one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


component_path = Path("components/ArchitectureFlow.tsx")
component = component_path.read_text()

component = replace_one(
    component,
    '    clearRelation: lang === "ja" ? "関係表示を解除" : lang === "zh" ? "清除关系焦点" : lang === "ko" ? "관계 포커스 해제" : "Clear relation focus",\n',
    '    clearRelation: lang === "ja" ? "関係表示を解除" : lang === "zh" ? "清除关系焦点" : lang === "ko" ? "관계 포커스 해제" : "Clear relation focus",\n'
    '    canvasTrace: lang === "ja" ? "Canvas部品から追跡" : "Trace from Canvas part",\n'
    '    canvasTraceNone: lang === "ja" ? "Canvas部品を選択" : "Choose Canvas part",\n'
    '    canvasTraceUnbound: lang === "ja" ? "Action未接続" : "No Action binding",\n'
    '    canvasTraceConflict: lang === "ja" ? "複数Actionに割当されています。先にbinding競合を解消してください。" : "Assigned to multiple Actions. Resolve the binding conflict first.",\n'
    '    canvasTraceSource: lang === "ja" ? "Canvas" : "Canvas",\n',
    "copy labels",
)

component = replace_one(
    component,
    '  const [highlightedEndpointKey, setHighlightedEndpointKey] = useState<string | null>(null);\n',
    '  const [highlightedEndpointKey, setHighlightedEndpointKey] = useState<string | null>(null);\n'
    '  const [canvasTraceItemId, setCanvasTraceItemId] = useState("");\n',
    "canvas trace state",
)

component = replace_one(
    component,
    '  const actionNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "action"), [flow.nodes]);\n'
    '  const quickSourceBindingState = useMemo(\n',
    '  const actionNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "action"), [flow.nodes]);\n'
    '  const canvasTraceItem = canvasTraceItemId ? canvasItems.find((item) => item.id === canvasTraceItemId) : undefined;\n'
    '  const canvasTraceBindingState = useMemo(\n'
    '    () => getArchitectureCanvasBindingState(actionNodes, canvasTraceItemId),\n'
    '    [actionNodes, canvasTraceItemId],\n'
    '  );\n'
    '  const quickSourceBindingState = useMemo(\n',
    "canvas trace derived state",
)

component = replace_one(
    component,
    '  useEffect(() => {\n'
    '    if (!frames.some((frame) => frame.id === quickSourceFrameId)) setQuickSourceFrameId(frames[0]?.id ?? "");\n'
    '    if (quickSourceItemId && !quickSourceItems.some((item) => item.id === quickSourceItemId)) setQuickSourceItemId("");\n'
    '    if (quickTargetFrameId && !frames.some((frame) => frame.id === quickTargetFrameId)) setQuickTargetFrameId("");\n'
    '  }, [frames, quickSourceFrameId, quickSourceItemId, quickSourceItems, quickTargetFrameId]);\n',
    '  useEffect(() => {\n'
    '    if (!frames.some((frame) => frame.id === quickSourceFrameId)) setQuickSourceFrameId(frames[0]?.id ?? "");\n'
    '    if (quickSourceItemId && !quickSourceItems.some((item) => item.id === quickSourceItemId)) setQuickSourceItemId("");\n'
    '    if (quickTargetFrameId && !frames.some((frame) => frame.id === quickTargetFrameId)) setQuickTargetFrameId("");\n'
    '    if (canvasTraceItemId && !canvasItems.some((item) => item.id === canvasTraceItemId)) setCanvasTraceItemId("");\n'
    '  }, [canvasItems, canvasTraceItemId, frames, quickSourceFrameId, quickSourceItemId, quickSourceItems, quickTargetFrameId]);\n',
    "clear stale canvas trace",
)

component = replace_one(
    component,
    '    setHighlightedEndpointKey(key);\n'
    '    requestAnimationFrame(() => focusGraphNode(focusEndpoint, "auto"));\n',
    '    setCanvasTraceItemId("");\n'
    '    setHighlightedEndpointKey(key);\n'
    '    requestAnimationFrame(() => focusGraphNode(focusEndpoint, "auto"));\n',
    "focus endpoint clears canvas trace",
)

component = replace_one(
    component,
    '    if (!connectMode) {\n'
    '      setHighlightedEndpointKey(clickedKey);\n',
    '    if (!connectMode) {\n'
    '      setCanvasTraceItemId("");\n'
    '      setHighlightedEndpointKey(clickedKey);\n',
    "graph node clears canvas trace",
)

component = replace_one(
    component,
    '  const focusDetailEditor = (endpoint: ArchitectureEndpoint) => {\n',
    '  const traceCanvasItem = (itemId: string) => {\n'
    '    setCanvasTraceItemId(itemId);\n'
    '    setGraphQuery("");\n'
    '    setGraphKindFilter("all");\n'
    '    setConnectMode(false);\n'
    '    setGraphSource(null);\n'
    '    setSelectedEdgeId(null);\n'
    '    if (!itemId) {\n'
    '      setHighlightedEndpointKey(null);\n'
    '      return;\n'
    '    }\n'
    '    const binding = getArchitectureCanvasBindingState(actionNodes, itemId);\n'
    '    if (binding.boundActions.length !== 1) {\n'
    '      setHighlightedEndpointKey(null);\n'
    '      return;\n'
    '    }\n'
    '    const endpoint: ArchitectureEndpoint = { kind: "action", id: binding.boundActions[0].id };\n'
    '    setHighlightedEndpointKey(architectureEndpointKey(endpoint));\n'
    '    requestAnimationFrame(() => focusGraphNode(endpoint));\n'
    '  };\n\n'
    '  const focusDetailEditor = (endpoint: ArchitectureEndpoint) => {\n',
    "trace canvas handler",
)

component = replace_one(
    component,
    '    setHighlightedEndpointKey(hasFocusableNode ? key : null);\n'
    '    setGraphQuery("");\n',
    '    setCanvasTraceItemId("");\n'
    '    setHighlightedEndpointKey(hasFocusableNode ? key : null);\n'
    '    setGraphQuery("");\n',
    "diagnostic clears canvas trace",
)

component = replace_one(
    component,
    '                  setSelectedEdgeId(null);\n'
    '                  setHighlightedEndpointKey(null);\n'
    '                }}\n',
    '                  setSelectedEdgeId(null);\n'
    '                  setCanvasTraceItemId("");\n'
    '                  setHighlightedEndpointKey(null);\n'
    '                }}\n',
    "connect mode clears canvas trace",
)

component = replace_one(
    component,
    '                  onChange={(event) => { setGraphQuery(event.target.value); setHighlightedEndpointKey(null); }}\n',
    '                  onChange={(event) => { setGraphQuery(event.target.value); setCanvasTraceItemId(""); setHighlightedEndpointKey(null); }}\n',
    "search clears canvas trace",
)
component = replace_one(
    component,
    '                  <button type="button" onClick={() => { setGraphQuery(""); setHighlightedEndpointKey(null); }} aria-label={copy.clearGraphSearch}',
    '                  <button type="button" onClick={() => { setGraphQuery(""); setCanvasTraceItemId(""); setHighlightedEndpointKey(null); }} aria-label={copy.clearGraphSearch}',
    "clear search clears canvas trace",
)
component = replace_one(
    component,
    '                onChange={(event) => { setGraphKindFilter(event.target.value as "all" | ArchitectureEndpoint["kind"]); setHighlightedEndpointKey(null); }}\n',
    '                onChange={(event) => { setGraphKindFilter(event.target.value as "all" | ArchitectureEndpoint["kind"]); setCanvasTraceItemId(""); setHighlightedEndpointKey(null); }}\n',
    "kind filter clears canvas trace",
)

kind_select_end = '''              </select>\n              <span data-testid="architecture-graph-search-count" style={{ fontSize: 12, fontWeight: 800, color: p.onSurfaceVariant }}>\n'''
canvas_select = '''              </select>\n              <select\n                data-testid="architecture-canvas-trace-source"\n                value={canvasTraceItemId}\n                onChange={(event) => traceCanvasItem(event.target.value)}\n                aria-label={copy.canvasTrace}\n                disabled={!canvasItems.length}\n                style={{ height: 40, maxWidth: "min(100%, 280px)", borderRadius: 20, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit", fontWeight: 750, opacity: canvasItems.length ? 1 : 0.55 }}\n              >\n                <option value="">{copy.canvasTrace}</option>\n                {canvasItems.map((item) => {\n                  const binding = getArchitectureCanvasBindingState(actionNodes, item.id);\n                  const ownerSuffix = binding.boundActions.length === 1\n                    ? ` → ${binding.boundActions[0].name}`\n                    : binding.boundActions.length > 1\n                      ? ` · ${binding.boundActions.length} Actions`\n                      : ` · ${copy.canvasTraceUnbound}`;\n                  return <option key={item.id} value={item.id}>{item.screenName ? `${item.screenName} · ` : ""}{item.label}{ownerSuffix}</option>;\n                })}\n              </select>\n              <span data-testid="architecture-graph-search-count" style={{ fontSize: 12, fontWeight: 800, color: p.onSurfaceVariant }}>\n'''
component = replace_one(component, kind_select_end, canvas_select, "canvas trace selector")

relation_marker = '''            {relationshipTrace && (\n              <div data-testid="architecture-graph-relation-summary"'''
trace_status = '''            {canvasTraceItem && canvasTraceBindingState.boundActions.length !== 1 && (\n              <div\n                data-testid="architecture-canvas-trace-status"\n                role="status"\n                style={{ minHeight: 42, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${p.outlineVariant}`, background: canvasTraceBindingState.conflicted ? p.errorContainer : p.surface, color: canvasTraceBindingState.conflicted ? p.onErrorContainer : p.onSurfaceVariant, fontSize: 12, fontWeight: 800 }}\n              >\n                <Icon name={canvasTraceBindingState.conflicted ? "warning" : "link_off"} size={18} />\n                <span>{copy.canvasTraceSource}: {canvasTraceItem.screenName ? `${canvasTraceItem.screenName} · ` : ""}{canvasTraceItem.label} · {canvasTraceBindingState.conflicted ? copy.canvasTraceConflict : copy.canvasTraceUnbound}</span>\n              </div>\n            )}\n\n            {relationshipTrace && (\n              <div data-testid="architecture-graph-relation-summary"'''
component = replace_one(component, relation_marker, trace_status, "canvas trace status")

component = replace_one(
    component,
    '                <Icon name="account_tree" size={19} />\n'
    '                <span style={{ fontSize: 12, fontWeight: 850 }}>{copy.relationFocus}: {relationshipLabel}</span>\n',
    '                <Icon name="account_tree" size={19} />\n'
    '                {canvasTraceItem && canvasTraceBindingState.boundActions.length === 1 && (\n'
    '                  <span data-testid="architecture-canvas-trace-context" style={{ fontSize: 11, fontWeight: 850, color: p.onSecondaryContainer, background: p.secondaryContainer, borderRadius: 12, padding: "4px 8px" }}>{copy.canvasTraceSource}: {canvasTraceItem.screenName ? `${canvasTraceItem.screenName} · ` : ""}{canvasTraceItem.label} →</span>\n'
    '                )}\n'
    '                <span style={{ fontSize: 12, fontWeight: 850 }}>{copy.relationFocus}: {relationshipLabel}</span>\n',
    "canvas trace relation context",
)

component = replace_one(
    component,
    '                <button type="button" data-testid="architecture-clear-relation-focus" onClick={() => setHighlightedEndpointKey(null)}',
    '                <button type="button" data-testid="architecture-clear-relation-focus" onClick={() => { setCanvasTraceItemId(""); setHighlightedEndpointKey(null); }}',
    "clear relation resets canvas trace",
)

component = replace_one(
    component,
    '                          onClick={() => { setSelectedEdgeId(edge.id); setConnectMode(false); setGraphSource(null); setHighlightedEndpointKey(null); }}\n',
    '                          onClick={() => { setSelectedEdgeId(edge.id); setConnectMode(false); setGraphSource(null); setCanvasTraceItemId(""); setHighlightedEndpointKey(null); }}\n',
    "edge click clears canvas trace",
)
component = replace_one(
    component,
    '                              setSelectedEdgeId(edge.id);\n'
    '                              setConnectMode(false);\n'
    '                              setGraphSource(null);\n'
    '                              setHighlightedEndpointKey(null);\n',
    '                              setSelectedEdgeId(edge.id);\n'
    '                              setConnectMode(false);\n'
    '                              setGraphSource(null);\n'
    '                              setCanvasTraceItemId("");\n'
    '                              setHighlightedEndpointKey(null);\n',
    "edge keyboard clears canvas trace",
)

component_path.write_text(component)


e2e_path = Path("e2e/core.e2e.ts")
e2e = e2e_path.read_text()
anchor = '''  await expect.poll(() => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const doc = raw ? JSON.parse(raw) : null;\n    return doc?.groups?.[0]?.items?.[0]?.action?.to ?? "";\n  })).toBe("details");\n\n  await architecture.getByRole("button", { name: "Close", exact: true }).click();\n'''
replacement = '''  await expect.poll(() => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const doc = raw ? JSON.parse(raw) : null;\n    return doc?.groups?.[0]?.items?.[0]?.action?.to ?? "";\n  })).toBe("details");\n\n  const storedBeforeTrace = await page.evaluate(() => localStorage.getItem("m3e:doc"));\n  const canvasTrace = architecture.getByTestId("architecture-canvas-trace-source");\n  const tracedOption = canvasTrace.locator('option[value="go-details"]');\n  await expect(tracedOption).toContainText("Home · Go details → Load details");\n  await canvasTrace.selectOption("go-details");\n\n  await expect(architecture.getByTestId("architecture-canvas-trace-context")).toContainText("Canvas: Home · Go details →");\n  await expect(actionNode).toHaveAttribute("data-relation", "focus");\n  await expect(apiNode).toHaveAttribute("data-relation", "downstream");\n  await expect(architecture.getByTestId("architecture-graph-node-frame-details")).toHaveAttribute("data-relation", "downstream");\n  await expect(architecture.getByTestId("architecture-graph-node-frame-home")).toHaveAttribute("data-relation", "upstream");\n  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(storedBeforeTrace);\n\n  await architecture.getByTestId("architecture-clear-relation-focus").click();\n  await expect(canvasTrace).toHaveValue("");\n  await expect(architecture.getByTestId("architecture-graph-relation-summary")).toHaveCount(0);\n\n  await architecture.getByRole("button", { name: "Close", exact: true }).click();\n'''
e2e = replace_one(e2e, anchor, replacement, "e2e canvas trace")
e2e_path.write_text(e2e)


doc_path = Path("docs/ARCHITECTURE_FLOW.md")
doc = doc_path.read_text()
old = "Focusing a node also traces every valid transitive upstream/downstream semantic relation, visually distinguishes the two directions, and dims unrelated branches; this relation focus is derived at runtime and never stored in the project."
new = "Focusing a node also traces every valid transitive upstream/downstream semantic relation, visually distinguishes the two directions, and dims unrelated branches. A Canvas trace selector can start the same view-only relation focus from a Canvas part: a uniquely bound part focuses its owning Action and therefore exposes the Canvas → Action → downstream API/Screen chain, while unbound parts and legacy duplicate owners are surfaced without guessing an Action. This relation focus is derived at runtime and never stored in the project."
doc = replace_one(doc, old, new, "architecture flow docs")
doc_path.write_text(doc)


todo_path = Path("docs/TODO.md")
todo = todo_path.read_text()
old = "- [x] Preview existing Action ownership before Quick flow rebinds a Canvas part, including legacy duplicate ownership, without mutating the document.\n"
new = old + "- [x] Trace Architecture relations from a Canvas part through its bound Action to downstream API/Screen nodes as view-only state, without guessing through binding conflicts.\n"
todo = replace_one(todo, old, new, "todo")
todo_path.write_text(todo)
