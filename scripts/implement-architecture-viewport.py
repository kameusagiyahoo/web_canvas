from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"missing replacement target: {label}")
    return text.replace(old, new, 1)

component_path = Path("components/ArchitectureFlow.tsx")
text = component_path.read_text()

text = replace_once(
    text,
    'import { useEffect, useMemo, useState, type CSSProperties } from "react";\n',
    'import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";\n',
    "react import",
)

text = replace_once(
    text,
    'import { useLang } from "@/lib/i18n";\n',
    'import { useLang } from "@/lib/i18n";\n'
    'import { fitGraphZoom, graphCenterScroll, stepGraphZoom } from "@/lib/graph-viewport";\n',
    "viewport helper import",
)

text = replace_once(
    text,
    '    clearGraphSearch: lang === "ja" ? "検索をクリア" : lang === "zh" ? "清除搜索" : lang === "ko" ? "검색 지우기" : "Clear search",\n',
    '    clearGraphSearch: lang === "ja" ? "検索をクリア" : lang === "zh" ? "清除搜索" : lang === "ko" ? "검색 지우기" : "Clear search",\n'
    '    zoomOut: lang === "ja" ? "縮小" : lang === "zh" ? "缩小" : lang === "ko" ? "축소" : "Zoom out",\n'
    '    zoomIn: lang === "ja" ? "拡大" : lang === "zh" ? "放大" : lang === "ko" ? "확대" : "Zoom in",\n'
    '    fitGraph: lang === "ja" ? "全体表示" : lang === "zh" ? "适合视图" : lang === "ko" ? "전체 보기" : "Fit to view",\n'
    '    zoomLabel: lang === "ja" ? "グラフのズーム" : lang === "zh" ? "图表缩放" : lang === "ko" ? "그래프 확대/축소" : "Graph zoom",\n',
    "copy zoom labels",
)

text = replace_once(
    text,
    '  const [graphQuery, setGraphQuery] = useState("");\n  const [graphKindFilter, setGraphKindFilter] = useState<"all" | ArchitectureEndpoint["kind"]>("all");\n\n',
    '  const [graphQuery, setGraphQuery] = useState("");\n'
    '  const [graphKindFilter, setGraphKindFilter] = useState<"all" | ArchitectureEndpoint["kind"]>("all");\n'
    '  const [graphZoom, setGraphZoom] = useState(1);\n'
    '  const graphViewportRef = useRef<HTMLDivElement | null>(null);\n\n',
    "viewport state",
)

helpers_target = '''  const addLink = () => {\n    const source = parseEndpoint(from);\n    const target = parseEndpoint(to);\n    if (!source || !target) return;\n    onConnect(source, target, label);\n    setLabel("");\n  };\n\n  const clickGraphNode = (endpoint: ArchitectureEndpoint) => {\n'''
helpers_new = '''  const addLink = () => {\n    const source = parseEndpoint(from);\n    const target = parseEndpoint(to);\n    if (!source || !target) return;\n    onConnect(source, target, label);\n    setLabel("");\n  };\n\n  const focusGraphNode = (endpoint: ArchitectureEndpoint, behavior: ScrollBehavior = "smooth") => {\n    const viewport = graphViewportRef.current;\n    const node = graphNodes.get(architectureEndpointKey(endpoint));\n    if (!viewport || !node) return;\n    const position = graphCenterScroll({\n      centerX: node.x + node.w / 2,\n      centerY: node.y + node.h / 2,\n      zoom: graphZoom,\n      viewportWidth: viewport.clientWidth,\n      viewportHeight: viewport.clientHeight,\n      scrollWidth: viewport.scrollWidth,\n      scrollHeight: viewport.scrollHeight,\n    });\n    viewport.scrollTo({ ...position, behavior });\n    const element = document.querySelector(`[data-testid="${endpointTestId(endpoint)}"]`) as HTMLElement | null;\n    element?.focus({ preventScroll: true });\n  };\n\n  const changeGraphZoom = (direction: -1 | 1) => {\n    const viewport = graphViewportRef.current;\n    const nextZoom = stepGraphZoom(graphZoom, direction);\n    if (nextZoom === graphZoom) return;\n    const centerGraphX = viewport ? (viewport.scrollLeft + viewport.clientWidth / 2) / graphZoom : 0;\n    const centerGraphY = viewport ? (viewport.scrollTop + viewport.clientHeight / 2) / graphZoom : 0;\n    setGraphZoom(nextZoom);\n    if (!viewport) return;\n    requestAnimationFrame(() => {\n      const current = graphViewportRef.current;\n      if (!current) return;\n      current.scrollTo({\n        left: Math.max(0, centerGraphX * nextZoom - current.clientWidth / 2),\n        top: Math.max(0, centerGraphY * nextZoom - current.clientHeight / 2),\n      });\n    });\n  };\n\n  const fitGraphToViewport = () => {\n    const viewport = graphViewportRef.current;\n    if (!viewport) return;\n    const nextZoom = fitGraphZoom(viewport.clientWidth, viewport.clientHeight, layout.width, layout.height);\n    setGraphZoom(nextZoom);\n    requestAnimationFrame(() => {\n      graphViewportRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });\n    });\n  };\n\n  const clickGraphNode = (endpoint: ArchitectureEndpoint) => {\n'''
text = replace_once(text, helpers_target, helpers_new, "viewport helpers")

text = replace_once(
    text,
    '    if (!connectMode) {\n      setHighlightedEndpointKey(clickedKey);\n      setSelectedEdgeId(null);\n      return;\n    }\n',
    '    if (!connectMode) {\n'
    '      setHighlightedEndpointKey(clickedKey);\n'
    '      setSelectedEdgeId(null);\n'
    '      requestAnimationFrame(() => focusGraphNode(endpoint));\n'
    '      return;\n'
    '    }\n',
    "node focus scroll",
)

old_focus = '''    requestAnimationFrame(() => {\n      const element = hasFocusableNode\n        ? document.querySelector(`[data-testid="${endpointTestId(endpoint)}"]`) as HTMLElement | null\n        : document.querySelector('[data-testid="architecture-graph-edge-editor"]') as HTMLElement | null;\n      element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });\n      element?.focus({ preventScroll: true });\n    });\n'''
new_focus = '''    requestAnimationFrame(() => {\n      if (hasFocusableNode) {\n        focusGraphNode(endpoint);\n        return;\n      }\n      const element = document.querySelector('[data-testid="architecture-graph-edge-editor"]') as HTMLElement | null;\n      element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });\n      element?.focus({ preventScroll: true });\n    });\n'''
text = replace_once(text, old_focus, new_focus, "diagnostic focus scroll")

zoom_controls_target = '''              <span data-testid="architecture-graph-search-count" style={{ fontSize: 12, fontWeight: 800, color: p.onSurfaceVariant }}>\n                {matchingNodeKeys.size}/{layout.nodes.length}\n              </span>\n              {graphFilterActive && matchingNodeKeys.size === 0 && (\n'''
zoom_controls_new = '''              <span data-testid="architecture-graph-search-count" style={{ fontSize: 12, fontWeight: 800, color: p.onSurfaceVariant }}>\n                {matchingNodeKeys.size}/{layout.nodes.length}\n              </span>\n              <div role="group" aria-label={copy.zoomLabel} data-testid="architecture-graph-zoom-controls" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>\n                <button type="button" data-testid="architecture-graph-zoom-out" aria-label={copy.zoomOut} onClick={() => changeGraphZoom(-1)} disabled={graphZoom <= 0.4} className="m3-press" style={{ width: 34, height: 34, border: `1px solid ${p.outlineVariant}`, borderRadius: 17, background: p.surface, color: p.onSurface, display: "grid", placeItems: "center", cursor: graphZoom <= 0.4 ? "default" : "pointer", opacity: graphZoom <= 0.4 ? 0.45 : 1 }}>\n                  <Icon name="zoom_out" size={18} />\n                </button>\n                <span data-testid="architecture-graph-zoom-value" style={{ minWidth: 46, textAlign: "center", fontSize: 12, fontWeight: 850, color: p.onSurfaceVariant }}>{Math.round(graphZoom * 100)}%</span>\n                <button type="button" data-testid="architecture-graph-zoom-in" aria-label={copy.zoomIn} onClick={() => changeGraphZoom(1)} disabled={graphZoom >= 1.6} className="m3-press" style={{ width: 34, height: 34, border: `1px solid ${p.outlineVariant}`, borderRadius: 17, background: p.surface, color: p.onSurface, display: "grid", placeItems: "center", cursor: graphZoom >= 1.6 ? "default" : "pointer", opacity: graphZoom >= 1.6 ? 0.45 : 1 }}>\n                  <Icon name="zoom_in" size={18} />\n                </button>\n                <button type="button" data-testid="architecture-graph-fit" onClick={fitGraphToViewport} className="m3-press" style={{ minHeight: 34, border: `1px solid ${p.outlineVariant}`, borderRadius: 17, background: p.surface, color: p.onSurface, padding: "0 10px", display: "flex", alignItems: "center", gap: 5, fontWeight: 800, cursor: "pointer" }}>\n                  <Icon name="fit_screen" size={17} />\n                  {copy.fitGraph}\n                </button>\n              </div>\n              {graphFilterActive && matchingNodeKeys.size === 0 && (\n'''
text = replace_once(text, zoom_controls_target, zoom_controls_new, "zoom controls")

viewport_target = '''            <div style={{ overflow: "auto", overscrollBehavior: "contain", maxHeight: "min(58vh, 620px)" }}>\n              <div style={{ position: "relative", width: layout.width, height: layout.height, minWidth: "100%", minHeight: 260 }}>\n'''
viewport_new = '''            <div ref={graphViewportRef} data-testid="architecture-graph-viewport" style={{ overflow: "auto", overscrollBehavior: "contain", maxHeight: "min(58vh, 620px)" }}>\n              <div data-testid="architecture-graph-scaled-space" style={{ position: "relative", width: Math.max(layout.width * graphZoom, 1), height: Math.max(layout.height * graphZoom, 260), minWidth: "100%" }}>\n                <div data-testid="architecture-graph-canvas" style={{ position: "absolute", left: 0, top: 0, width: layout.width, height: layout.height, transform: `scale(${graphZoom})`, transformOrigin: "top left" }}>\n'''
text = replace_once(text, viewport_target, viewport_new, "scaled viewport")

closing_target = '''                })}\n              </div>\n            </div>\n          </section>\n\n          <section data-testid="architecture-diagnostics"'''
closing_new = '''                })}\n                </div>\n              </div>\n            </div>\n          </section>\n\n          <section data-testid="architecture-diagnostics"'''
text = replace_once(text, closing_target, closing_new, "scaled viewport closing")

component_path.write_text(text)

Path("lib/graph-viewport.ts").write_text(r'''export const MIN_GRAPH_ZOOM = 0.4;
export const MAX_GRAPH_ZOOM = 1.6;
export const GRAPH_ZOOM_STEP = 0.1;

export function clampGraphZoom(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_GRAPH_ZOOM, Math.max(MIN_GRAPH_ZOOM, Math.round(value * 100) / 100));
}

export function stepGraphZoom(current: number, direction: -1 | 1) {
  return clampGraphZoom(Math.round((current + direction * GRAPH_ZOOM_STEP) * 10) / 10);
}

export function fitGraphZoom(
  viewportWidth: number,
  viewportHeight: number,
  graphWidth: number,
  graphHeight: number,
  padding = 24,
) {
  if (viewportWidth <= 0 || viewportHeight <= 0 || graphWidth <= 0 || graphHeight <= 0) return 1;
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  return clampGraphZoom(Math.min(1, availableWidth / graphWidth, availableHeight / graphHeight));
}

export function graphCenterScroll({
  centerX,
  centerY,
  zoom,
  viewportWidth,
  viewportHeight,
  scrollWidth,
  scrollHeight,
}: {
  centerX: number;
  centerY: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}) {
  const maxLeft = Math.max(0, scrollWidth - viewportWidth);
  const maxTop = Math.max(0, scrollHeight - viewportHeight);
  return {
    left: Math.min(maxLeft, Math.max(0, centerX * zoom - viewportWidth / 2)),
    top: Math.min(maxTop, Math.max(0, centerY * zoom - viewportHeight / 2)),
  };
}
''')

Path("lib/graph-viewport.test.ts").write_text(r'''import { describe, expect, it } from "vitest";
import { fitGraphZoom, graphCenterScroll, stepGraphZoom } from "./graph-viewport";

describe("graph viewport helpers", () => {
  it("steps zoom within the supported range", () => {
    expect(stepGraphZoom(1, 1)).toBe(1.1);
    expect(stepGraphZoom(1, -1)).toBe(0.9);
    expect(stepGraphZoom(1.6, 1)).toBe(1.6);
    expect(stepGraphZoom(0.4, -1)).toBe(0.4);
  });

  it("fits a graph without enlarging small layouts", () => {
    expect(fitGraphZoom(1000, 600, 2000, 1000)).toBeCloseTo(0.48, 2);
    expect(fitGraphZoom(1000, 600, 400, 300)).toBe(1);
    expect(fitGraphZoom(300, 200, 4000, 3000)).toBe(0.4);
  });

  it("centers a node while clamping to scroll bounds", () => {
    expect(graphCenterScroll({ centerX: 800, centerY: 400, zoom: 1.5, viewportWidth: 600, viewportHeight: 400, scrollWidth: 1600, scrollHeight: 1000 })).toEqual({ left: 900, top: 400 });
    expect(graphCenterScroll({ centerX: 20, centerY: 20, zoom: 1, viewportWidth: 600, viewportHeight: 400, scrollWidth: 1600, scrollHeight: 1000 })).toEqual({ left: 0, top: 0 });
  });
});
''')

# E2E: zoom, fit-to-view, and focused-node centering remain view-only.
e2e_path = Path("e2e/core.e2e.ts")
e2e = e2e_path.read_text()
marker = 'test("architecture graph viewport controls are view-only"'
if marker not in e2e:
    e2e += r'''


test("architecture graph viewport controls are view-only", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-api-method").selectOption("POST");
  await architecture.getByTestId("architecture-api-path").fill("/api/login");
  await architecture.getByTestId("architecture-api-name").fill("Login API");
  await architecture.getByTestId("architecture-add-api").click();
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  const zoomValue = architecture.getByTestId("architecture-graph-zoom-value");
  const canvas = architecture.getByTestId("architecture-graph-canvas");
  await expect(zoomValue).toHaveText("100%");
  await architecture.getByTestId("architecture-graph-zoom-in").click();
  await expect(zoomValue).toHaveText("110%");
  await expect(canvas).toHaveCSS("transform", /matrix\(1\.1/);

  for (let index = 0; index < 5; index += 1) {
    await architecture.getByTestId("architecture-graph-zoom-in").click();
  }
  await expect(zoomValue).toHaveText("160%");
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Login API" });
  await apiNode.click();
  await expect(apiNode).toBeFocused();
  await expect.poll(() => architecture.getByTestId("architecture-graph-viewport").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  await architecture.getByTestId("architecture-graph-fit").click();
  await expect.poll(async () => Number((await zoomValue.textContent())?.replace("%", "") ?? "0")).toBeLessThanOrEqual(100);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
'''
e2e_path.write_text(e2e)

flow_doc_path = Path("docs/ARCHITECTURE_FLOW.md")
flow_doc = flow_doc_path.read_text()
old = "The editor now renders the combined Screen + Action + API model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action and API nodes are persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology. Node-name search and Screen/Action/API kind filtering dim non-matching nodes without changing the deterministic layout or persisted document; clicking a node outside connect mode provides a transient focus highlight."
new = old + " View-only zoom controls support incremental zoom and Fit to view; clicking or diagnostically focusing a node centers it in the graph viewport without persisting viewport state."
if old not in flow_doc:
    raise SystemExit("missing Architecture Flow doc target")
flow_doc_path.write_text(flow_doc.replace(old, new, 1))

todo_path = Path("docs/TODO.md")
todo = todo_path.read_text()
old = "- [x] Add Architecture Flow node-name search, Screen/Action/API kind filtering, and transient node focus without changing layout or project data.\n"
new = old + "- [x] Add view-only Architecture Flow zoom, Fit to view, and centered node focus without persisting viewport state.\n"
if old not in todo:
    raise SystemExit("missing TODO target")
todo_path.write_text(todo.replace(old, new, 1))
