from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

# Add search state and derived matches.
replace_once(
    "components/NavigationGraph.tsx",
    '  const [pendingTrigger, setPendingTrigger] = useState<NavigationRouteTrigger | null>(null);\n',
    '  const [pendingTrigger, setPendingTrigger] = useState<NavigationRouteTrigger | null>(null);\n  const [searchQuery, setSearchQuery] = useState("");\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    '  const validEdges = graph.edges.filter((edge) => edge.validTarget);\n  const pairIndex = new Map<string, number>();\n',
    '''  const validEdges = graph.edges.filter((edge) => edge.validTarget);\n  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();\n  const matchingFrameIds = new Set(\n    graph.nodes\n      .filter((node) => !normalizedSearch || node.label.toLocaleLowerCase().includes(normalizedSearch))\n      .map((node) => node.frameId),\n  );\n  const pairIndex = new Map<string, number>();\n''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '    transition: lang === "ja" ? "画面切り替え" : lang === "zh" ? "画面过渡" : lang === "ko" ? "화면 전환" : "Screen transition",\n',
    '    transition: lang === "ja" ? "画面切り替え" : lang === "zh" ? "画面过渡" : lang === "ko" ? "화면 전환" : "Screen transition",\n    search: lang === "ja" ? "画面を検索" : lang === "zh" ? "搜索画面" : lang === "ko" ? "화면 검색" : "Search screens",\n    noMatch: lang === "ja" ? "一致する画面はありません" : lang === "zh" ? "没有匹配的画面" : lang === "ko" ? "일치하는 화면이 없습니다" : "No matching screens",\n',
)

# Add compact search bar below the main header.
header_anchor = '''      </header>\n\n      <div style={{ flex: 1, minHeight: 0, overflow: "auto", overscrollBehavior: "contain" }}>'''
header_new = '''      </header>\n\n      <div\n        style={{\n          flex: "0 0 auto",\n          minHeight: 52,\n          padding: "7px 14px",\n          borderBottom: `1px solid ${p.outlineVariant}`,\n          background: p.surface,\n          display: "flex",\n          alignItems: "center",\n          gap: 10,\n        }}\n      >\n        <Icon name="search" size={20} />\n        <input\n          type="search"\n          data-testid="graph-screen-search"\n          aria-label={routeCopy.search}\n          placeholder={routeCopy.search}\n          value={searchQuery}\n          onChange={(event) => setSearchQuery(event.target.value)}\n          style={{\n            flex: 1,\n            minWidth: 0,\n            minHeight: 38,\n            border: `1px solid ${p.outlineVariant}`,\n            borderRadius: 19,\n            background: p.surfaceContainerLow,\n            color: p.onSurface,\n            padding: "0 14px",\n            outline: "none",\n            font: "inherit",\n          }}\n        />\n        {normalizedSearch && (\n          <span data-testid="graph-search-count" style={{ minWidth: 46, textAlign: "right", color: matchingFrameIds.size ? p.onSurfaceVariant : p.error, fontSize: 12, fontWeight: 800 }}>\n            {matchingFrameIds.size}/{graph.nodes.length}\n          </span>\n        )}\n      </div>\n\n      <div style={{ flex: 1, minHeight: 0, overflow: "auto", overscrollBehavior: "contain" }}>'''
replace_once("components/NavigationGraph.tsx", header_anchor, header_new)

# Dim non-matches without changing graph layout or edge routing.
replace_once(
    "components/NavigationGraph.tsx",
    '              const reachable = graph.reachableFrameIds.includes(node.frameId);\n              return (\n',
    '              const reachable = graph.reachableFrameIds.includes(node.frameId);\n              const searchMatch = matchingFrameIds.has(node.frameId);\n              return (\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    '                    overflow: "hidden",\n                  }}\n',
    '                    overflow: "hidden",\n                    opacity: normalizedSearch && !searchMatch ? 0.24 : 1,\n                    transition: "opacity 120ms ease",\n                  }}\n',
)

# Add a clear empty-result message inside the canvas overlay.
replace_once(
    "components/NavigationGraph.tsx",
    '''            {layout.nodes.map((node) => {''',
    '''            {normalizedSearch && matchingFrameIds.size === 0 && (\n              <div\n                data-testid="graph-search-empty"\n                style={{ position: "absolute", left: 20, top: 18, zIndex: 5, padding: "8px 12px", borderRadius: 14, background: p.errorContainer, color: p.onErrorContainer, fontSize: 12, fontWeight: 800 }}\n              >\n                {routeCopy.noMatch}\n              </div>\n            )}\n            {layout.nodes.map((node) => {''',
)

# Browser coverage: search narrows visually without changing persisted Doc.
e2e = Path("e2e/core.e2e.ts")
text = e2e.read_text()
if 'test("navigation graph search highlights matching screens without mutating the document"' not in text:
    text += '''\n\ntest("navigation graph search highlights matching screens without mutating the document", async ({ page }) => {\n  await openSeeded(page);\n  await page.getByTitle("Screen flow").click();\n  const graph = page.getByTestId("navigation-graph");\n  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));\n\n  const search = graph.getByTestId("graph-screen-search");\n  await search.fill("details");\n  await expect(graph.getByTestId("graph-search-count")).toHaveText("1/2");\n  await expect(graph.getByTestId("graph-node-details")).toHaveCSS("opacity", "1");\n  await expect(graph.getByTestId("graph-node-home")).toHaveCSS("opacity", "0.24");\n\n  await search.fill("missing screen");\n  await expect(graph.getByTestId("graph-search-empty")).toBeVisible();\n  const after = await page.evaluate(() => localStorage.getItem("m3e:doc"));\n  expect(after).toBe(before);\n});\n'''
    e2e.write_text(text)

print("navigation graph search integrated")
