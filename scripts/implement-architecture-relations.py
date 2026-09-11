from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing replacement target: {label}")
    return text.replace(old, new, 1)

# ---------- relation tracing domain helper ----------
flow_path = Path("lib/architecture-flow.ts")
flow = flow_path.read_text()
insert_target = '''  ];\n}\n\n\nexport type ArchitectureDiagnosticKind =\n'''
insert_new = '''  ];\n}\n\nexport type ArchitectureRelationTrace = {\n  focusKey: string;\n  upstreamNodeKeys: Set<string>;\n  downstreamNodeKeys: Set<string>;\n  upstreamEdgeIds: Set<string>;\n  downstreamEdgeIds: Set<string>;\n  relatedNodeKeys: Set<string>;\n  relatedEdgeIds: Set<string>;\n};\n\n/**\n * Derive every valid semantic node/edge that can reach the focused endpoint (upstream)\n * or can be reached from it (downstream). Broken links are deliberately ignored, and\n * cycles are bounded by visited sets so this remains a view-only graph operation.\n */\nexport function traceArchitectureRelations(\n  frames: readonly Frame[],\n  flow: ArchitectureFlow,\n  focus: ArchitectureEndpoint,\n): ArchitectureRelationTrace | null {\n  if (!architectureEndpointExists(focus, frames, flow)) return null;\n\n  const focusKey = architectureEndpointKey(focus);\n  const known = new Set(architectureEndpointOptions(frames, flow).map((option) => architectureEndpointKey(option.endpoint)));\n  const outgoing = new Map<string, Array<{ key: string; edgeId: string }>>();\n  const incoming = new Map<string, Array<{ key: string; edgeId: string }>>();\n  known.forEach((key) => {\n    outgoing.set(key, []);\n    incoming.set(key, []);\n  });\n\n  for (const edge of flow.edges) {\n    const from = architectureEndpointKey(edge.from);\n    const to = architectureEndpointKey(edge.to);\n    if (!known.has(from) || !known.has(to)) continue;\n    outgoing.get(from)?.push({ key: to, edgeId: edge.id });\n    incoming.get(to)?.push({ key: from, edgeId: edge.id });\n  }\n\n  const downstreamNodeKeys = new Set<string>();\n  const downstreamEdgeIds = new Set<string>();\n  const visitedDownstream = new Set<string>([focusKey]);\n  const walkDownstream = (key: string) => {\n    for (const relation of outgoing.get(key) ?? []) {\n      downstreamEdgeIds.add(relation.edgeId);\n      if (relation.key !== focusKey) downstreamNodeKeys.add(relation.key);\n      if (visitedDownstream.has(relation.key)) continue;\n      visitedDownstream.add(relation.key);\n      walkDownstream(relation.key);\n    }\n  };\n  walkDownstream(focusKey);\n\n  const upstreamNodeKeys = new Set<string>();\n  const upstreamEdgeIds = new Set<string>();\n  const visitedUpstream = new Set<string>([focusKey]);\n  const walkUpstream = (key: string) => {\n    for (const relation of incoming.get(key) ?? []) {\n      upstreamEdgeIds.add(relation.edgeId);\n      if (relation.key !== focusKey) upstreamNodeKeys.add(relation.key);\n      if (visitedUpstream.has(relation.key)) continue;\n      visitedUpstream.add(relation.key);\n      walkUpstream(relation.key);\n    }\n  };\n  walkUpstream(focusKey);\n\n  return {\n    focusKey,\n    upstreamNodeKeys,\n    downstreamNodeKeys,\n    upstreamEdgeIds,\n    downstreamEdgeIds,\n    relatedNodeKeys: new Set([focusKey, ...upstreamNodeKeys, ...downstreamNodeKeys]),\n    relatedEdgeIds: new Set([...upstreamEdgeIds, ...downstreamEdgeIds]),\n  };\n}\n\nexport type ArchitectureDiagnosticKind =\n'''
flow = replace_once(flow, insert_target, insert_new, "relation tracing helper")
flow_path.write_text(flow)

# ---------- unit tests ----------
test_path = Path("lib/architecture-flow.test.ts")
tests = test_path.read_text()
tests = replace_once(
    tests,
    '  renameArchitectureAction,\n  updateArchitectureApi,\n  layoutArchitectureGraph,\n',
    '  renameArchitectureAction,\n  updateArchitectureApi,\n  layoutArchitectureGraph,\n  traceArchitectureRelations,\n',
    "relation helper import",
)
layout_marker = '\n\ndescribe("architecture graph layout", () => {'
relation_tests = r'''

describe("architecture relation tracing", () => {
  it("separates transitive upstream and downstream paths from unrelated nodes", () => {
    const relationFrames: Frame[] = [
      { id: "home", name: "Home", x: 0, y: 0 },
      { id: "details", name: "Details", x: 500, y: 0 },
    ];
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [
        { id: "validate", kind: "action", name: "Validate" },
        { id: "login", kind: "api", name: "Login API", method: "POST", path: "/api/login" },
        { id: "orphan", kind: "action", name: "Unrelated" },
      ],
      edges: [
        { id: "home-validate", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" } },
        { id: "validate-login", from: { kind: "action", id: "validate" }, to: { kind: "api", id: "login" } },
        { id: "login-details", from: { kind: "api", id: "login" }, to: { kind: "frame", id: "details" } },
      ],
    };

    const trace = traceArchitectureRelations(relationFrames, flow, { kind: "action", id: "validate" });
    expect(trace).not.toBeNull();
    expect([...trace!.upstreamNodeKeys]).toEqual(["frame:home"]);
    expect([...trace!.downstreamNodeKeys]).toEqual(["api:login", "frame:details"]);
    expect([...trace!.upstreamEdgeIds]).toEqual(["home-validate"]);
    expect([...trace!.downstreamEdgeIds]).toEqual(["validate-login", "login-details"]);
    expect(trace!.relatedNodeKeys.has("action:orphan")).toBe(false);
  });

  it("stays finite through cycles and ignores broken semantic links", () => {
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [
        { id: "a", kind: "action", name: "A" },
        { id: "b", kind: "action", name: "B" },
      ],
      edges: [
        { id: "ab", from: { kind: "action", id: "a" }, to: { kind: "action", id: "b" } },
        { id: "ba", from: { kind: "action", id: "b" }, to: { kind: "action", id: "a" } },
        { id: "broken", from: { kind: "action", id: "a" }, to: { kind: "frame", id: "missing" } },
      ],
    };

    const trace = traceArchitectureRelations([], flow, { kind: "action", id: "a" });
    expect(trace).not.toBeNull();
    expect(trace!.upstreamNodeKeys.has("action:b")).toBe(true);
    expect(trace!.downstreamNodeKeys.has("action:b")).toBe(true);
    expect(trace!.relatedEdgeIds).toEqual(new Set(["ab", "ba"]));
    expect(trace!.relatedEdgeIds.has("broken")).toBe(false);
    expect(traceArchitectureRelations([], flow, { kind: "frame", id: "missing" })).toBeNull();
  });
});
'''
if layout_marker not in tests:
    raise SystemExit("missing architecture layout test marker")
tests = tests.replace(layout_marker, relation_tests + layout_marker, 1)
test_path.write_text(tests)

# ---------- Architecture Flow UI ----------
component_path = Path("components/ArchitectureFlow.tsx")
text = component_path.read_text()
text = replace_once(
    text,
    '  diagnoseArchitectureFlow,\n  layoutArchitectureGraph,\n',
    '  diagnoseArchitectureFlow,\n  layoutArchitectureGraph,\n  traceArchitectureRelations,\n',
    "relation tracing UI import",
)
text = replace_once(
    text,
    '    zoomLabel: lang === "ja" ? "グラフのズーム" : lang === "zh" ? "图表缩放" : lang === "ko" ? "그래프 확대/축소" : "Graph zoom",\n',
    '    zoomLabel: lang === "ja" ? "グラフのズーム" : lang === "zh" ? "图表缩放" : lang === "ko" ? "그래프 확대/축소" : "Graph zoom",\n'
    '    relationFocus: lang === "ja" ? "関係を表示" : lang === "zh" ? "关系焦点" : lang === "ko" ? "관계 포커스" : "Relation focus",\n'
    '    relationUpstream: lang === "ja" ? "上流" : lang === "zh" ? "上游" : lang === "ko" ? "상류" : "Upstream",\n'
    '    relationDownstream: lang === "ja" ? "下流" : lang === "zh" ? "下游" : lang === "ko" ? "하류" : "Downstream",\n'
    '    relationBoth: lang === "ja" ? "上下流" : lang === "zh" ? "上下游" : lang === "ko" ? "상·하류" : "Both",\n'
    '    clearRelation: lang === "ja" ? "関係表示を解除" : lang === "zh" ? "清除关系焦点" : lang === "ko" ? "관계 포커스 해제" : "Clear relation focus",\n',
    "relation copy",
)
text = replace_once(
    text,
    '  const graphNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.key, node])), [layout.nodes]);\n  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;\n',
    '  const graphNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.key, node])), [layout.nodes]);\n'
    '  const relationshipTrace = useMemo(() => {\n'
    '    if (!highlightedEndpointKey) return null;\n'
    '    const endpoint = parseEndpoint(highlightedEndpointKey);\n'
    '    return endpoint ? traceArchitectureRelations(frames, flow, endpoint) : null;\n'
    '  }, [flow, frames, highlightedEndpointKey]);\n'
    '  const relationshipLabel = relationshipTrace ? labels.get(relationshipTrace.focusKey) ?? relationshipTrace.focusKey : null;\n'
    '  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;\n',
    "relation derived state",
)
text = replace_once(
    text,
    '                  setGraphSource(null);\n                  setSelectedEdgeId(null);\n',
    '                  setGraphSource(null);\n                  setSelectedEdgeId(null);\n                  setHighlightedEndpointKey(null);\n',
    "clear relation entering connect mode",
)
search_end = '''              {graphFilterActive && matchingNodeKeys.size === 0 && (\n                <span data-testid="architecture-graph-search-empty" style={{ width: "100%", fontSize: 12, color: p.error, fontWeight: 750 }}>{copy.graphNoMatches}</span>\n              )}\n            </div>\n\n            {(connectMode || selectedEdge) && (\n'''
search_new = '''              {graphFilterActive && matchingNodeKeys.size === 0 && (\n                <span data-testid="architecture-graph-search-empty" style={{ width: "100%", fontSize: 12, color: p.error, fontWeight: 750 }}>{copy.graphNoMatches}</span>\n              )}\n            </div>\n\n            {relationshipTrace && (\n              <div data-testid="architecture-graph-relation-summary" style={{ minHeight: 44, padding: "8px 14px", display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", borderBottom: `1px solid ${p.outlineVariant}`, background: p.surface }}>\n                <Icon name="account_tree" size={19} />\n                <span style={{ fontSize: 12, fontWeight: 850 }}>{copy.relationFocus}: {relationshipLabel}</span>\n                <span data-testid="architecture-relation-upstream-count" style={{ fontSize: 11, fontWeight: 800, color: p.onTertiaryContainer, background: p.tertiaryContainer, borderRadius: 12, padding: "4px 8px" }}>{copy.relationUpstream} {relationshipTrace.upstreamNodeKeys.size}</span>\n                <span data-testid="architecture-relation-downstream-count" style={{ fontSize: 11, fontWeight: 800, color: p.onPrimaryContainer, background: p.primaryContainer, borderRadius: 12, padding: "4px 8px" }}>{copy.relationDownstream} {relationshipTrace.downstreamNodeKeys.size}</span>\n                <button type="button" data-testid="architecture-clear-relation-focus" onClick={() => setHighlightedEndpointKey(null)} className="m3-press" style={{ marginLeft: "auto", minHeight: 32, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, background: p.surface, color: p.onSurfaceVariant, padding: "0 10px", fontWeight: 800, cursor: "pointer" }}>{copy.clearRelation}</button>\n              </div>\n            )}\n\n            {(connectMode || selectedEdge) && (\n'''
text = replace_once(text, search_end, search_new, "relation summary")

# Add colored arrow markers.
marker_target = '''                    <marker id="architecture-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">\n                      <path d="M 0 0 L 8 4 L 0 8 z" fill={p.outline} />\n                    </marker>\n'''
marker_new = '''                    <marker id="architecture-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">\n                      <path d="M 0 0 L 8 4 L 0 8 z" fill={p.outline} />\n                    </marker>\n                    <marker id="architecture-arrow-upstream" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">\n                      <path d="M 0 0 L 8 4 L 0 8 z" fill={p.onTertiaryContainer} />\n                    </marker>\n                    <marker id="architecture-arrow-downstream" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">\n                      <path d="M 0 0 L 8 4 L 0 8 z" fill={p.primary} />\n                    </marker>\n                    <marker id="architecture-arrow-both" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">\n                      <path d="M 0 0 L 8 4 L 0 8 z" fill={p.onSurface} />\n                    </marker>\n'''
text = replace_once(text, marker_target, marker_new, "relation arrow markers")

edge_target = '''                    const selected = edge.id === selectedEdgeId;\n                    const edgeMatches = matchingNodeKeys.has(architectureEndpointKey(edge.from)) || matchingNodeKeys.has(architectureEndpointKey(edge.to));\n                    return (\n                      <g key={edge.id} opacity={graphFilterActive && !edgeMatches ? 0.14 : 1}>\n                        <path d={d} fill="none" stroke={selected ? p.primary : p.outline} strokeWidth={selected ? 3 : 2} markerEnd="url(#architecture-arrow)" />\n'''
edge_new = '''                    const selected = edge.id === selectedEdgeId;\n                    const edgeMatches = matchingNodeKeys.has(architectureEndpointKey(edge.from)) || matchingNodeKeys.has(architectureEndpointKey(edge.to));\n                    const relationUpstream = relationshipTrace?.upstreamEdgeIds.has(edge.id) ?? false;\n                    const relationDownstream = relationshipTrace?.downstreamEdgeIds.has(edge.id) ?? false;\n                    const relation = !relationshipTrace ? "none" : relationUpstream && relationDownstream ? "both" : relationUpstream ? "upstream" : relationDownstream ? "downstream" : "unrelated";\n                    const relationMatches = relation !== "unrelated";\n                    const edgeDimmed = (graphFilterActive && !edgeMatches) || (Boolean(relationshipTrace) && !relationMatches);\n                    const relationStroke = relation === "upstream" ? p.onTertiaryContainer : relation === "downstream" ? p.primary : relation === "both" ? p.onSurface : p.outline;\n                    const marker = relation === "upstream" ? "architecture-arrow-upstream" : relation === "downstream" ? "architecture-arrow-downstream" : relation === "both" ? "architecture-arrow-both" : "architecture-arrow";\n                    return (\n                      <g key={edge.id} data-relation={relation} opacity={edgeDimmed ? 0.12 : 1}>\n                        <path d={d} fill="none" stroke={selected ? p.primary : relationStroke} strokeWidth={selected || relationMatches ? 3 : 2} markerEnd={`url(#${selected ? "architecture-arrow-downstream" : marker})`} />\n'''
text = replace_once(text, edge_target, edge_new, "relation edge rendering")
text = replace_once(
    text,
    '                          data-testid={`architecture-graph-link-${edge.id}`}\n                          role="button"\n',
    '                          data-testid={`architecture-graph-link-${edge.id}`}\n                          data-relation={relation}\n                          role="button"\n',
    "edge relation test attribute",
)
text = text.replace(
    'onClick={() => { setSelectedEdgeId(edge.id); setConnectMode(false); setGraphSource(null); }}',
    'onClick={() => { setSelectedEdgeId(edge.id); setConnectMode(false); setGraphSource(null); setHighlightedEndpointKey(null); }}',
)
text = text.replace(
    'setSelectedEdgeId(edge.id);\n                              setConnectMode(false);\n                              setGraphSource(null);',
    'setSelectedEdgeId(edge.id);\n                              setConnectMode(false);\n                              setGraphSource(null);\n                              setHighlightedEndpointKey(null);',
)

node_target = '''                  const highlighted = highlightedEndpointKey === node.key;\n                  const searchMatch = matchingNodeKeys.has(node.key);\n                  const diagnosticColor = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.error : p.primary;\n                  const diagnosticBorder = highlighted || nodeDiagnostics.length > 0;\n                  return (\n'''
node_new = '''                  const highlighted = highlightedEndpointKey === node.key;\n                  const searchMatch = matchingNodeKeys.has(node.key);\n                  const relationUpstream = relationshipTrace?.upstreamNodeKeys.has(node.key) ?? false;\n                  const relationDownstream = relationshipTrace?.downstreamNodeKeys.has(node.key) ?? false;\n                  const relation = !relationshipTrace ? "none" : highlighted ? "focus" : relationUpstream && relationDownstream ? "both" : relationUpstream ? "upstream" : relationDownstream ? "downstream" : "unrelated";\n                  const relationMatches = relation !== "unrelated";\n                  const relationshipColor = relation === "upstream" ? p.onTertiaryContainer : relation === "downstream" ? p.primary : relation === "both" ? p.onSurfaceVariant : p.outlineVariant;\n                  const diagnosticColor = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.error : p.primary;\n                  const diagnosticBorder = highlighted || nodeDiagnostics.length > 0;\n                  const relationshipDimmed = Boolean(relationshipTrace) && !relationMatches;\n                  const searchDimmed = graphFilterActive && !searchMatch && !highlighted;\n                  return (\n'''
text = replace_once(text, node_target, node_new, "relation node derivation")
text = replace_once(
    text,
    '                      data-testid={endpointTestId(node.endpoint)}\n                      aria-pressed={source || undefined}\n',
    '                      data-testid={endpointTestId(node.endpoint)}\n                      data-relation={relation}\n                      aria-pressed={source || undefined}\n',
    "node relation test attribute",
)
text = replace_once(
    text,
    '                        border: `${source || highlighted ? 3 : nodeDiagnostics.length ? 2 : 1}px solid ${source ? p.primary : diagnosticBorder ? diagnosticColor : p.outlineVariant}`,\n',
    '                        border: `${source || highlighted ? 3 : relationMatches && relation !== "none" ? 2 : nodeDiagnostics.length ? 2 : 1}px solid ${source ? p.primary : diagnosticBorder ? diagnosticColor : relationMatches && relation !== "none" ? relationshipColor : p.outlineVariant}`,\n',
    "relation node border",
)
text = replace_once(
    text,
    '                        opacity: graphFilterActive && !searchMatch ? 0.22 : 1,\n',
    '                        opacity: relationshipDimmed ? 0.12 : searchDimmed ? 0.22 : 1,\n',
    "relation node opacity",
)
node_badge_target = '''                        {action ? copy.actionBadge : api ? copy.apiBadge : copy.screenBadge}\n                        {nodeDiagnostics.length > 0 && (\n'''
node_badge_new = '''                        {action ? copy.actionBadge : api ? copy.apiBadge : copy.screenBadge}\n                        {(relation === "upstream" || relation === "downstream" || relation === "both") && (\n                          <span data-testid={`architecture-relation-badge-${node.key}`} style={{ marginLeft: 2, borderRadius: 8, padding: "2px 5px", background: relation === "upstream" ? p.tertiaryContainer : relation === "downstream" ? p.primaryContainer : p.surfaceContainerHighest, color: relation === "upstream" ? p.onTertiaryContainer : relation === "downstream" ? p.onPrimaryContainer : p.onSurfaceVariant, fontSize: 9, fontWeight: 900 }}>\n                            {relation === "upstream" ? copy.relationUpstream : relation === "downstream" ? copy.relationDownstream : copy.relationBoth}\n                          </span>\n                        )}\n                        {nodeDiagnostics.length > 0 && (\n'''
text = replace_once(text, node_badge_target, node_badge_new, "relation node badge")
component_path.write_text(text)

# ---------- E2E ----------
e2e_path = Path("e2e/core.e2e.ts")
e2e = e2e_path.read_text()
marker = 'test("architecture relation focus traces upstream and downstream without mutating the document"'
if marker not in e2e:
    e2e += r'''


test("architecture relation focus traces upstream and downstream without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();

  const homeNode = architecture.getByTestId("architecture-graph-node-frame-home");
  const detailsNode = architecture.getByTestId("architecture-graph-node-frame-details");
  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });

  await architecture.getByTestId("architecture-connect-mode").click();
  await homeNode.click();
  await actionNode.click();
  await actionNode.click();
  await apiNode.click();
  await architecture.getByTestId("architecture-connect-mode").click();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await actionNode.click();
  await expect(architecture.getByTestId("architecture-graph-relation-summary")).toBeVisible();
  await expect(architecture.getByTestId("architecture-relation-upstream-count")).toHaveText(/1$/);
  await expect(architecture.getByTestId("architecture-relation-downstream-count")).toHaveText(/1$/);
  await expect(homeNode).toHaveAttribute("data-relation", "upstream");
  await expect(actionNode).toHaveAttribute("data-relation", "focus");
  await expect(apiNode).toHaveAttribute("data-relation", "downstream");
  await expect(detailsNode).toHaveAttribute("data-relation", "unrelated");
  await expect(detailsNode).toHaveCSS("opacity", "0.12");
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"][data-relation="upstream"]')).toHaveCount(1);
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"][data-relation="downstream"]')).toHaveCount(1);

  await architecture.getByTestId("architecture-clear-relation-focus").click();
  await expect(architecture.getByTestId("architecture-graph-relation-summary")).toHaveCount(0);
  await expect(detailsNode).toHaveAttribute("data-relation", "none");
  await expect(detailsNode).toHaveCSS("opacity", "1");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
'''
e2e_path.write_text(e2e)

# ---------- docs ----------
flow_doc_path = Path("docs/ARCHITECTURE_FLOW.md")
flow_doc = flow_doc_path.read_text()
old = "The editor now renders the combined Screen + Action + API model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action and API nodes are persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology. Node-name search and Screen/Action/API kind filtering dim non-matching nodes without changing the deterministic layout or persisted document; clicking a node outside connect mode provides a transient focus highlight. View-only zoom controls support incremental zoom and Fit to view; clicking or diagnostically focusing a node centers it in the graph viewport without persisting viewport state."
new = old + " Focusing a node also traces every valid transitive upstream/downstream semantic relation, visually distinguishes the two directions, and dims unrelated branches; this relation focus is derived at runtime and never stored in the project."
if old not in flow_doc:
    raise SystemExit("missing Architecture Flow visual paragraph")
flow_doc_path.write_text(flow_doc.replace(old, new, 1))

todo_path = Path("docs/TODO.md")
todo = todo_path.read_text()
old = "- [x] Add view-only Architecture Flow zoom, Fit to view, and centered node focus without persisting viewport state.\n"
new = old + "- [x] Trace transitive upstream/downstream relations from a focused Architecture node and dim unrelated branches without mutating project data.\n"
if old not in todo:
    raise SystemExit("missing Architecture TODO viewport item")
todo_path.write_text(todo.replace(old, new, 1))
