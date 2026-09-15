from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}\n--- needle ---\n{old}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "components/NavigationGraph.tsx",
    'import { useEffect, useMemo, useState } from "react";',
    'import { useEffect, useMemo, useRef, useState } from "react";',
)
replace_once(
    "components/NavigationGraph.tsx",
    'import { useLang, type Lang } from "@/lib/i18n";\n',
    'import { useLang, type Lang } from "@/lib/i18n";\nimport { graphCenterScroll } from "@/lib/graph-viewport";\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    '  const [searchQuery, setSearchQuery] = useState("");\n  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);\n',
    '  const [searchQuery, setSearchQuery] = useState("");\n  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);\n  const graphViewportRef = useRef<HTMLDivElement | null>(null);\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();\n  const matchingFrameIds = new Set(\n    graph.nodes\n      .filter((node) => !normalizedSearch || node.label.toLocaleLowerCase().includes(normalizedSearch))\n      .map((node) => node.frameId),\n  );\n  const pairIndex = new Map<string, number>();\n''',
    '''  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();\n  const matchingFrameIds = useMemo(\n    () => new Set(\n      graph.nodes\n        .filter((node) => !normalizedSearch || node.label.toLocaleLowerCase().includes(normalizedSearch))\n        .map((node) => node.frameId),\n    ),\n    [graph.nodes, normalizedSearch],\n  );\n  const uniqueMatchingFrameId = normalizedSearch && matchingFrameIds.size === 1\n    ? matchingFrameIds.values().next().value ?? null\n    : null;\n\n  useEffect(() => {\n    if (!uniqueMatchingFrameId) return;\n    const viewport = graphViewportRef.current;\n    const node = nodeById.get(uniqueMatchingFrameId);\n    if (!viewport || !node) return;\n    const position = graphCenterScroll({\n      centerX: node.x + layout.nodeWidth / 2,\n      centerY: node.y + layout.nodeHeight / 2,\n      zoom: 1,\n      viewportWidth: viewport.clientWidth,\n      viewportHeight: viewport.clientHeight,\n      scrollWidth: viewport.scrollWidth,\n      scrollHeight: viewport.scrollHeight,\n    });\n    viewport.scrollTo({ ...position, behavior: "smooth" });\n  }, [layout.nodeHeight, layout.nodeWidth, nodeById, uniqueMatchingFrameId]);\n\n  const pairIndex = new Map<string, number>();\n''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '      <div style={{ flex: 1, minHeight: 0, overflow: "auto", overscrollBehavior: "contain" }}>\n',
    '      <div ref={graphViewportRef} data-testid="graph-viewport" style={{ flex: 1, minHeight: 0, overflow: "auto", overscrollBehavior: "contain" }}>\n',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''  const graphFilterActive = graphKindFilter !== "all" || Boolean(normalizedGraphQuery);\n  const graphNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.key, node])), [layout.nodes]);\n''',
    '''  const graphFilterActive = graphKindFilter !== "all" || Boolean(normalizedGraphQuery);\n  const uniqueMatchingEndpoint = useMemo(() => {\n    if (!graphFilterActive || matchingNodeKeys.size !== 1) return null;\n    const key = matchingNodeKeys.values().next().value;\n    return key ? parseEndpoint(key) : null;\n  }, [graphFilterActive, matchingNodeKeys]);\n  const graphNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.key, node])), [layout.nodes]);\n''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '  const focusGraphNode = (endpoint: ArchitectureEndpoint, behavior: ScrollBehavior = "smooth") => {\n',
    '  const focusGraphNode = (endpoint: ArchitectureEndpoint, behavior: ScrollBehavior = "smooth", moveFocus = true) => {\n',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '''    const element = document.querySelector(`[data-testid="${endpointTestId(endpoint)}"]`) as HTMLElement | null;\n    element?.focus({ preventScroll: true });\n  };\n\n  useEffect(() => {\n    if (!focusEndpoint) return;\n''',
    '''    if (moveFocus) {\n      const element = document.querySelector(`[data-testid="${endpointTestId(endpoint)}"]`) as HTMLElement | null;\n      element?.focus({ preventScroll: true });\n    }\n  };\n\n  useEffect(() => {\n    if (!uniqueMatchingEndpoint) return;\n    requestAnimationFrame(() => focusGraphNode(uniqueMatchingEndpoint, "smooth", false));\n  }, [graphZoom, uniqueMatchingEndpoint?.kind, uniqueMatchingEndpoint?.id]);\n\n  useEffect(() => {\n    if (!focusEndpoint) return;\n''',
)

Path("e2e/mobile-large-graphs.e2e.ts").write_text(r'''import { expect, test, type Page } from "@playwright/test";

const SCREEN_COUNT = 18;

function makeLargeDoc() {
  const frames = Array.from({ length: SCREEN_COUNT }, (_, index) => ({
    id: `screen-${index + 1}`,
    name: index === SCREEN_COUNT - 1 ? "Final target" : `Screen ${String(index + 1).padStart(2, "0")}`,
    x: index * 532,
    y: 0,
    ...(index < SCREEN_COUNT - 1 ? { swipe: { left: `screen-${index + 2}` } } : {}),
  }));

  const nodes = Array.from({ length: SCREEN_COUNT - 1 }, (_, index) => [
    { id: `action-${index + 1}`, kind: "action", name: `Process step ${String(index + 1).padStart(2, "0")}` },
    {
      id: `api-${index + 1}`,
      kind: "api",
      name: index === SCREEN_COUNT - 2 ? "Remote Archive API" : `Step API ${String(index + 1).padStart(2, "0")}`,
      method: "GET",
      path: `/api/step-${index + 1}`,
    },
  ]).flat();

  const edges = Array.from({ length: SCREEN_COUNT - 1 }, (_, index) => [
    {
      id: `frame-action-${index + 1}`,
      from: { kind: "frame", id: `screen-${index + 1}` },
      to: { kind: "action", id: `action-${index + 1}` },
    },
    {
      id: `action-api-${index + 1}`,
      from: { kind: "action", id: `action-${index + 1}` },
      to: { kind: "api", id: `api-${index + 1}` },
    },
    {
      id: `api-frame-${index + 1}`,
      from: { kind: "api", id: `api-${index + 1}` },
      to: { kind: "frame", id: `screen-${index + 2}` },
    },
  ]).flat();

  return {
    title: "Large mobile graph",
    paletteKey: "purple",
    frame: "phone",
    brief: "",
    groups: [],
    frames,
    architecture: { version: 1, nodes, edges },
  };
}

async function openLargeDoc(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  const doc = makeLargeDoc();
  await page.addInitScript(({ seed }) => {
    localStorage.setItem("m3e:doc", JSON.stringify(seed));
    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));
  }, { seed: doc });
  await page.goto("/");
  await expect(page.getByTitle("Undo")).toBeVisible();
}

async function nodeFullyInsideViewport(page: Page, viewportTestId: string, nodeTestId: string) {
  return page.evaluate(({ viewportTestId, nodeTestId }) => {
    const viewport = document.querySelector<HTMLElement>(`[data-testid="${viewportTestId}"]`);
    const node = document.querySelector<HTMLElement>(`[data-testid="${nodeTestId}"]`);
    if (!viewport || !node) return false;
    const viewportRect = viewport.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    return nodeRect.left >= viewportRect.left
      && nodeRect.right <= viewportRect.right
      && nodeRect.top >= viewportRect.top
      && nodeRect.bottom <= viewportRect.bottom;
  }, { viewportTestId, nodeTestId });
}

test("mobile Navigation search auto-centers a unique result in a large graph without mutating the document", async ({ page }) => {
  await openLargeDoc(page);

  await page.getByTitle("Screen").click();
  await page.getByRole("button", { name: "Screen flow", exact: true }).click();
  const graph = page.getByTestId("navigation-graph");
  const viewport = graph.getByTestId("graph-viewport");
  const target = graph.getByTestId("graph-node-screen-18");
  await expect(graph).toBeVisible();
  await expect.poll(() => viewport.evaluate((element) => element.scrollWidth > element.clientWidth * 4)).toBe(true);
  await expect.poll(() => nodeFullyInsideViewport(page, "graph-viewport", "graph-node-screen-18")).toBe(false);

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  const search = graph.getByTestId("graph-screen-search");
  await search.fill("Final target");
  await expect(graph.getByTestId("graph-search-count")).toHaveText(`1/${SCREEN_COUNT}`);
  await expect(target).toHaveCSS("opacity", "1");
  await expect(search).toBeFocused();
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(() => nodeFullyInsideViewport(page, "graph-viewport", "graph-node-screen-18")).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});

test("mobile Architecture search and kind filter auto-center a unique result without mutating the document", async ({ page }) => {
  await openLargeDoc(page);

  await page.getByTitle("Screen").click();
  await page.getByRole("button", { name: "App architecture", exact: true }).click();
  const architecture = page.getByTestId("architecture-flow");
  const viewport = architecture.getByTestId("architecture-graph-viewport");
  const target = architecture.getByTestId("architecture-graph-node-api-api-17");
  await expect(architecture).toBeVisible();
  await expect.poll(() => viewport.evaluate((element) => element.scrollWidth > element.clientWidth * 4)).toBe(true);
  await expect.poll(() => nodeFullyInsideViewport(page, "architecture-graph-viewport", "architecture-graph-node-api-api-17")).toBe(false);

  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  await architecture.getByTestId("architecture-graph-kind-filter").selectOption("api");
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText(`17/${SCREEN_COUNT + (SCREEN_COUNT - 1) * 2}`);

  const search = architecture.getByTestId("architecture-graph-search");
  await search.fill("Remote Archive API");
  await expect(architecture.getByTestId("architecture-graph-search-count")).toHaveText(`1/${SCREEN_COUNT + (SCREEN_COUNT - 1) * 2}`);
  await expect(target).toHaveCSS("opacity", "1");
  await expect(search).toBeFocused();
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect.poll(() => nodeFullyInsideViewport(page, "architecture-graph-viewport", "architecture-graph-node-api-api-17")).toBe(true);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
''')

replace_once(
    "docs/TODO.md",
    '- [ ] スマホで大規模Navigation/Architectureを扱う際の検索・focus操作を評価\n',
    '- [x] スマホで大規模Navigation/Architectureを扱う際の検索・focus操作を評価\n',
)
replace_once(
    "docs/ROADMAP.md",
    '- スマホSettingsからのAI設定とPart BehaviorのAI補助\n',
    '- スマホSettingsからのAI設定とPart BehaviorのAI補助\n- 大規模Navigation/Architectureのスマホ検索をE2E評価し、唯一の一致を自動センタリング\n',
)
replace_once(
    "docs/ROADMAP.md",
    '- 大規模Navigation/Architectureのスマホ操作評価\n',
    '',
)
replace_once(
    "docs/USER_GUIDE.md",
    '下部のScreenボタンからScreen一覧を開きます。追加、選択、名前変更、複製、削除、Preview、Navigation Graph、Architecture、Projectsへ移動できます。\n',
    '下部のScreenボタンからScreen一覧を開きます。追加、選択、名前変更、複製、削除、Preview、Navigation Graph、Architecture、Projectsへ移動できます。大規模なNavigation Graph / Architectureでは、検索や種類絞り込みで候補が1件になると、そのノードが自動で見える位置へ移動します。検索入力中のフォーカスは維持されます。\n',
)

# This temporary patcher and its workflow must not remain in the feature diff.
Path("scripts/apply_mobile_large_graph_focus.py").unlink()
Path(".github/workflows/chatgpt-mobile-large-graph-focus.yml").unlink()
