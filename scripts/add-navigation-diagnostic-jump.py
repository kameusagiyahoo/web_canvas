from pathlib import Path

# 1) Add a pure mapping from diagnostics to navigation intent.
p = Path('lib/navigation-graph.ts')
s = p.read_text()
needle = '''export type NavigationGraph = {\n  nodes: NavigationNode[];'''
insert = '''export type NavigationProblemAction =\n  | { kind: "locate-edge"; edgeId: string }\n  | { kind: "select-edge"; edgeId: string }\n  | { kind: "focus-frame"; frameId: string };\n\nexport function navigationProblemAction(problem: NavigationProblem): NavigationProblemAction {\n  if (problem.kind === "missing-target") {\n    return { kind: "locate-edge", edgeId: problem.edgeId };\n  }\n  if (problem.kind === "parallel") {\n    return { kind: "select-edge", edgeId: problem.edgeIds[0] };\n  }\n  return { kind: "focus-frame", frameId: problem.frameId };\n}\n\nexport type NavigationGraph = {\n  nodes: NavigationNode[];'''
if needle not in s:
    raise SystemExit('navigation-graph insertion point not found')
s = s.replace(needle, insert, 1)
p.write_text(s)

# 2) Unit coverage for diagnostic routing.
p = Path('lib/navigation-graph.test.ts')
s = p.read_text()
s = s.replace(
'import { deriveNavigationGraph, layoutNavigationGraph } from "./navigation-graph";',
'import { deriveNavigationGraph, layoutNavigationGraph, navigationProblemAction } from "./navigation-graph";',
1,
)
append = '''\n\ndescribe("navigationProblemAction", () => {\n  it("routes missing targets to their source edge", () => {\n    expect(navigationProblemAction({\n      kind: "missing-target",\n      edgeId: "item:home:broken:tap:missing",\n      fromFrameId: "home",\n      targetId: "missing",\n    })).toEqual({ kind: "locate-edge", edgeId: "item:home:broken:tap:missing" });\n  });\n\n  it("routes screen diagnostics to the affected frame", () => {\n    expect(navigationProblemAction({ kind: "unreachable", frameId: "details" }))\n      .toEqual({ kind: "focus-frame", frameId: "details" });\n    expect(navigationProblemAction({ kind: "no-incoming", frameId: "details" }))\n      .toEqual({ kind: "focus-frame", frameId: "details" });\n  });\n\n  it("routes parallel diagnostics to the first concrete route", () => {\n    expect(navigationProblemAction({\n      kind: "parallel",\n      fromFrameId: "home",\n      toFrameId: "details",\n      edgeIds: ["edge-a", "edge-b"],\n    })).toEqual({ kind: "select-edge", edgeId: "edge-a" });\n  });\n});\n'''
if 'describe("navigationProblemAction"' not in s:
    s += append
p.write_text(s)

# 3) Make graph diagnostics inspectable and actionable.
p = Path('components/NavigationGraph.tsx')
s = p.read_text()
s = s.replace(
'''  deriveNavigationGraph,\n  layoutNavigationGraph,''',
'''  deriveNavigationGraph,\n  layoutNavigationGraph,\n  navigationProblemAction,''',
1,
)
s = s.replace(
'''  const [searchQuery, setSearchQuery] = useState("");''',
'''  const [searchQuery, setSearchQuery] = useState("");\n  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);''',
1,
)
needle = '''  const selectedEdgeDescription = selectedEdge\n'''
insert = '''  const activateProblem = (problem: NavigationProblem) => {\n    const action = navigationProblemAction(problem);\n    setDiagnosticsOpen(false);\n    setSearchQuery("");\n    if (action.kind === "focus-frame") {\n      onSelectFrame(action.frameId);\n      return;\n    }\n    const edge = graph.edges.find((candidate) => candidate.id === action.edgeId);\n    if (!edge) return;\n    if (action.kind === "locate-edge") {\n      onLocateEdge(edge);\n      return;\n    }\n    setSelectedEdgeId(edge.id);\n  };\n\n  const selectedEdgeDescription = selectedEdge\n'''
if needle not in s:
    raise SystemExit('NavigationGraph activate insertion point not found')
s = s.replace(needle, insert, 1)
old = '''        <span style={{ marginLeft: 6, fontWeight: 800, color: graph.problems.length ? p.error : p.onSurfaceVariant }}>{copy.issues} {graph.problems.length}</span>'''
new = '''        <button\n          type="button"\n          data-testid="graph-problems-toggle"\n          aria-expanded={diagnosticsOpen}\n          onClick={() => graph.problems.length && setDiagnosticsOpen((open) => !open)}\n          disabled={graph.problems.length === 0}\n          className="m3-press"\n          style={{\n            marginLeft: 6,\n            minHeight: 32,\n            border: "none",\n            borderRadius: 16,\n            padding: "0 10px",\n            background: graph.problems.length ? p.errorContainer : "transparent",\n            color: graph.problems.length ? p.onErrorContainer : p.onSurfaceVariant,\n            fontWeight: 800,\n            cursor: graph.problems.length ? "pointer" : "default",\n          }}\n        >\n          {copy.issues} {graph.problems.length}\n        </button>'''
if old not in s:
    raise SystemExit('NavigationGraph issue count not found')
s = s.replace(old, new, 1)
old = '''        {!selectedEdge && graph.problems.length === 0 && <span>{copy.noIssues}</span>}\n        {!selectedEdge && graph.problems.length > 0 && (\n          <span title={graph.problems.map(problemText).join("\\n")} style={{ flex: "1 1 260px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>\n            {problemText(graph.problems[0])}{graph.problems.length > 1 ? ` (+${graph.problems.length - 1})` : ""}\n          </span>\n        )}'''
new = '''        {!selectedEdge && !diagnosticsOpen && graph.problems.length === 0 && <span>{copy.noIssues}</span>}\n        {!selectedEdge && !diagnosticsOpen && graph.problems.length > 0 && (\n          <span title={graph.problems.map(problemText).join("\\n")} style={{ flex: "1 1 260px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>\n            {problemText(graph.problems[0])}{graph.problems.length > 1 ? ` (+${graph.problems.length - 1})` : ""}\n          </span>\n        )}\n        {diagnosticsOpen && graph.problems.length > 0 && (\n          <div\n            data-testid="graph-problems-panel"\n            style={{\n              flex: "1 0 100%",\n              display: "grid",\n              gap: 6,\n              paddingTop: 4,\n            }}\n          >\n            {graph.problems.map((problem, index) => (\n              <button\n                key={`${problem.kind}-${index}`}\n                type="button"\n                data-testid={`graph-problem-${problem.kind}-${index}`}\n                onClick={() => activateProblem(problem)}\n                className="m3-press"\n                style={{\n                  width: "100%",\n                  minHeight: 40,\n                  border: `1px solid ${p.outlineVariant}`,\n                  borderRadius: 14,\n                  padding: "8px 12px",\n                  background: p.surface,\n                  color: p.onSurface,\n                  textAlign: "left",\n                  fontWeight: 700,\n                  cursor: "pointer",\n                }}\n              >\n                {problemText(problem)}\n              </button>\n            ))}\n          </div>\n        )}'''
if old not in s:
    raise SystemExit('NavigationGraph problem summary block not found')
s = s.replace(old, new, 1)
p.write_text(s)

# 4) Browser coverage: a broken target diagnostic jumps to the source item without changing Doc.
p = Path('e2e/core.e2e.ts')
s = p.read_text()
append = r'''

test("navigation graph diagnostics jump to the affected source without mutating the document", async ({ page }) => {
  const brokenDoc = {
    ...seedDoc,
    groups: seedDoc.groups.map((group) => group.id !== "home-group" ? group : ({
      ...group,
      items: group.items.map((item) => item.id !== "go-details" ? item : ({
        ...item,
        action: { to: "missing-screen", transition: "slide" },
      })),
    })),
  };
  await page.addInitScript(({ doc }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(doc));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { doc: brokenDoc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await page.getByTitle("Screen flow").click();
  const graph = page.getByTestId("navigation-graph");
  await graph.getByTestId("graph-problems-toggle").click();
  const problems = graph.getByTestId("graph-problems-panel");
  await expect(problems).toBeVisible();
  await problems.getByRole("button", { name: /Target screen is missing/ }).click();

  await expect(graph).toBeHidden();
  await expect(page.getByTitle("Duplicate (Ctrl+D)")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
'''
if 'navigation graph diagnostics jump to the affected source' not in s:
    s += append
p.write_text(s)
