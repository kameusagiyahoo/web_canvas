from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing replacement target: {label}")
    return text.replace(old, new, 1)

component_path = Path("components/ArchitectureFlow.tsx")
text = component_path.read_text()

text = replace_once(
    text,
    '    graphHint: lang === "ja" ? "位置は自動配置です。ノード位置はプロジェクトには保存しません。" : "Layout is automatic and node positions are not stored in the project.",\n',
    '    graphHint: lang === "ja" ? "位置は自動配置です。ノード位置はプロジェクトには保存しません。" : "Layout is automatic and node positions are not stored in the project.",\n'
    '    graphSearch: lang === "ja" ? "ノードを検索" : lang === "zh" ? "搜索节点" : lang === "ko" ? "노드 검색" : "Search nodes",\n'
    '    graphAllKinds: lang === "ja" ? "すべて" : lang === "zh" ? "全部" : lang === "ko" ? "전체" : "All",\n'
    '    graphNoMatches: lang === "ja" ? "一致するノードはありません" : lang === "zh" ? "没有匹配的节点" : lang === "ko" ? "일치하는 노드가 없습니다" : "No matching nodes",\n'
    '    clearGraphSearch: lang === "ja" ? "検索をクリア" : lang === "zh" ? "清除搜索" : lang === "ko" ? "검색 지우기" : "Clear search",\n',
    "copy",
)

text = replace_once(
    text,
    '  const [highlightedEndpointKey, setHighlightedEndpointKey] = useState<string | null>(null);\n\n  const options = useMemo(() => architectureEndpointOptions(frames, flow), [frames, flow]);\n',
    '  const [highlightedEndpointKey, setHighlightedEndpointKey] = useState<string | null>(null);\n'
    '  const [graphQuery, setGraphQuery] = useState("");\n'
    '  const [graphKindFilter, setGraphKindFilter] = useState<"all" | ArchitectureEndpoint["kind"]>("all");\n\n'
    '  const options = useMemo(() => architectureEndpointOptions(frames, flow), [frames, flow]);\n',
    "state",
)

text = replace_once(
    text,
    '  const layout = useMemo(() => layoutArchitectureGraph(frames, flow), [frames, flow]);\n  const graphNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.key, node])), [layout.nodes]);\n',
    '  const layout = useMemo(() => layoutArchitectureGraph(frames, flow), [frames, flow]);\n'
    '  const normalizedGraphQuery = graphQuery.trim().toLocaleLowerCase();\n'
    '  const matchingNodeKeys = useMemo(() => {\n'
    '    const matches = new Set<string>();\n'
    '    layout.nodes.forEach((node) => {\n'
    '      const kindMatches = graphKindFilter === "all" || node.kind === graphKindFilter;\n'
    '      const queryMatches = !normalizedGraphQuery || node.label.toLocaleLowerCase().includes(normalizedGraphQuery);\n'
    '      if (kindMatches && queryMatches) matches.add(node.key);\n'
    '    });\n'
    '    return matches;\n'
    '  }, [graphKindFilter, layout.nodes, normalizedGraphQuery]);\n'
    '  const graphFilterActive = graphKindFilter !== "all" || Boolean(normalizedGraphQuery);\n'
    '  const graphNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.key, node])), [layout.nodes]);\n',
    "derived search",
)

text = replace_once(
    text,
    '  const clickGraphNode = (endpoint: ArchitectureEndpoint) => {\n    setHighlightedEndpointKey(null);\n    if (!connectMode) return;\n',
    '  const clickGraphNode = (endpoint: ArchitectureEndpoint) => {\n'
    '    const clickedKey = architectureEndpointKey(endpoint);\n'
    '    if (!connectMode) {\n'
    '      setHighlightedEndpointKey(clickedKey);\n'
    '      setSelectedEdgeId(null);\n'
    '      return;\n'
    '    }\n'
    '    setHighlightedEndpointKey(null);\n',
    "node focus",
)

text = replace_once(
    text,
    '    setHighlightedEndpointKey(hasFocusableNode ? key : null);\n    setConnectMode(false);\n',
    '    setHighlightedEndpointKey(hasFocusableNode ? key : null);\n'
    '    setGraphQuery("");\n'
    '    setGraphKindFilter("all");\n'
    '    setConnectMode(false);\n',
    "diagnostic clears filter",
)

header_target = '''            </div>\n\n            {(connectMode || selectedEdge) && (\n'''
header_new = '''            </div>\n\n            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${p.outlineVariant}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: p.surface }}>\n              <label style={{ flex: "1 1 230px", minWidth: "min(100%, 210px)", height: 40, border: `1px solid ${p.outlineVariant}`, borderRadius: 20, display: "flex", alignItems: "center", gap: 7, padding: "0 11px", color: p.onSurfaceVariant }}>\n                <Icon name="search" size={18} />\n                <input\n                  data-testid="architecture-graph-search"\n                  value={graphQuery}\n                  onChange={(event) => setGraphQuery(event.target.value)}\n                  aria-label={copy.graphSearch}\n                  placeholder={copy.graphSearch}\n                  style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: p.onSurface, font: "inherit" }}\n                />\n                {graphQuery && (\n                  <button type="button" onClick={() => setGraphQuery("")} aria-label={copy.clearGraphSearch} className="m3-press" style={{ width: 28, height: 28, border: "none", borderRadius: 14, background: "transparent", color: p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer" }}>\n                    <Icon name="close" size={16} />\n                  </button>\n                )}\n              </label>\n              <select\n                data-testid="architecture-graph-kind-filter"\n                value={graphKindFilter}\n                onChange={(event) => setGraphKindFilter(event.target.value as "all" | ArchitectureEndpoint["kind"])}\n                aria-label={lang === "ja" ? "ノード種類" : "Node kind"}\n                style={{ height: 40, borderRadius: 20, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 12px", font: "inherit", fontWeight: 750 }}\n              >\n                <option value="all">{copy.graphAllKinds}</option>\n                <option value="frame">{copy.screenBadge}</option>\n                <option value="action">{copy.actionBadge}</option>\n                <option value="api">{copy.apiBadge}</option>\n              </select>\n              <span data-testid="architecture-graph-search-count" style={{ fontSize: 12, fontWeight: 800, color: p.onSurfaceVariant }}>\n                {matchingNodeKeys.size}/{layout.nodes.length}\n              </span>\n              {graphFilterActive && matchingNodeKeys.size === 0 && (\n                <span data-testid="architecture-graph-search-empty" style={{ width: "100%", fontSize: 12, color: p.error, fontWeight: 750 }}>{copy.graphNoMatches}</span>\n              )}\n            </div>\n\n            {(connectMode || selectedEdge) && (\n'''
text = replace_once(text, header_target, header_new, "search controls")

text = replace_once(
    text,
    '                  {flow.edges.map((edge) => {\n                    const d = graphPath(edge);\n                    if (!d) return null;\n                    const selected = edge.id === selectedEdgeId;\n                    return (\n                      <g key={edge.id}>\n',
    '                  {flow.edges.map((edge) => {\n'
    '                    const d = graphPath(edge);\n'
    '                    if (!d) return null;\n'
    '                    const selected = edge.id === selectedEdgeId;\n'
    '                    const edgeMatches = matchingNodeKeys.has(architectureEndpointKey(edge.from)) || matchingNodeKeys.has(architectureEndpointKey(edge.to));\n'
    '                    return (\n'
    '                      <g key={edge.id} opacity={graphFilterActive && !edgeMatches ? 0.14 : 1}>\n',
    "edge dimming",
)

text = replace_once(
    text,
    '                  const highlighted = highlightedEndpointKey === node.key;\n                  const diagnosticColor = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.error : p.primary;\n',
    '                  const highlighted = highlightedEndpointKey === node.key;\n'
    '                  const searchMatch = matchingNodeKeys.has(node.key);\n'
    '                  const diagnosticColor = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.error : p.primary;\n',
    "node search match",
)

text = replace_once(
    text,
    '                        overflow: "hidden",\n                      }}\n',
    '                        overflow: "hidden",\n'
    '                        opacity: graphFilterActive && !searchMatch ? 0.22 : 1,\n'
    '                        transition: "opacity 120ms ease, box-shadow 120ms ease, border-color 120ms ease",\n'
    '                      }}\n',
    "node dimming",
)

component_path.write_text(text)

# E2E: search/filter is display-only and node click can focus.
e2e_path = Path("e2e/core.e2e.ts")
e2e = e2e_path.read_text()
marker = 'test("architecture graph search and kind filters focus nodes without mutating the document"'
if marker not in e2e:
    e2e += r'''


test("architecture graph search and kind filters focus nodes without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();
  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });
  const homeNode = architecture.getByTestId("architecture-graph-node-frame-home");
  await expect(actionNode).toHaveCount(1);
  await expect(apiNode).toHaveCount(1);

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  const search = architecture.getByTestId("architecture-graph-search");
  await search.fill("login api");
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText("1/4");
  await expect(apiNode).toHaveCSS("opacity", "1");
  await expect(homeNode).toHaveCSS("opacity", "0.22");
  await apiNode.click();
  await expect(apiNode).toBeFocused();

  await search.fill("");
  await architecture.getByTestId("architecture-graph-kind-filter").selectOption("action");
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText("1/4");
  await expect(actionNode).toHaveCSS("opacity", "1");
  await expect(apiNode).toHaveCSS("opacity", "0.22");

  await architecture.getByTestId("architecture-graph-kind-filter").selectOption("all");
  await search.fill("does-not-exist");
  await expect(architecture.getByTestId("architecture-graph-search-empty")).toBeVisible();
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText("0/4");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
'''
e2e_path.write_text(e2e)

# Documentation
flow_doc_path = Path("docs/ARCHITECTURE_FLOW.md")
flow_doc = flow_doc_path.read_text()
old = "The editor now renders the combined Screen + Action + API model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action and API nodes are persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology."
new = old + " Node-name search and Screen/Action/API kind filtering dim non-matching nodes without changing the deterministic layout or persisted document; clicking a node outside connect mode provides a transient focus highlight."
if old not in flow_doc:
    raise SystemExit("missing architecture flow doc target")
flow_doc_path.write_text(flow_doc.replace(old, new, 1))

todo_path = Path("docs/TODO.md")
todo = todo_path.read_text()
old = "- [x] Extend Architecture Flow diagnostics to isolated APIs, duplicate HTTP method + path definitions, and API cycle participation without mutating project data.\n"
new = old + "- [x] Add Architecture Flow node-name search, Screen/Action/API kind filtering, and transient node focus without changing layout or project data.\n"
if old not in todo:
    raise SystemExit("missing TODO target")
todo_path.write_text(todo.replace(old, new, 1))
