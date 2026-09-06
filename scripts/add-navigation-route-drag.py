from pathlib import Path

# rerun after tightening navigation-route command types

def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))

# Component imports and prop.
replace_once(
    "components/NavigationGraph.tsx",
    'import type { NavigationEdgePatch } from "@/lib/navigation-graph-edit";\n',
    'import { availableNavigationRouteTriggers, type NavigationEdgePatch, type NavigationRouteTrigger } from "@/lib/navigation-graph-edit";\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    "  onEditEdge,\n  onClose,",
    "  onEditEdge,\n  onCreateRoute,\n  onClose,",
)
replace_once(
    "components/NavigationGraph.tsx",
    "  onEditEdge: (edge: NavigationEdge, patch: NavigationEdgePatch) => void;\n  onClose: () => void;",
    "  onEditEdge: (edge: NavigationEdge, patch: NavigationEdgePatch) => void;\n  onCreateRoute: (sourceFrameId: string, targetFrameId: string, trigger: NavigationRouteTrigger) => void;\n  onClose: () => void;",
)
replace_once(
    "components/NavigationGraph.tsx",
    "  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);",
    '''  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);\n  const [routeDrag, setRouteDrag] = useState<{ sourceFrameId: string; x0: number; y0: number; x1: number; y1: number } | null>(null);\n  const [pendingRoute, setPendingRoute] = useState<{ sourceFrameId: string; targetFrameId: string } | null>(null);''',
)
replace_once(
    "components/NavigationGraph.tsx",
    "  const validEdges = graph.edges.filter((edge) => edge.validTarget);\n  const pairIndex = new Map<string, number>();",
    '''  const validEdges = graph.edges.filter((edge) => edge.validTarget);\n  const pairIndex = new Map<string, number>();\n  const pendingTriggers = pendingRoute\n    ? availableNavigationRouteTriggers(doc, widths, pendingRoute.sourceFrameId)\n    : [];\n  const routeCopy = {\n    create: lang === "ja" ? "新しい遷移" : lang === "zh" ? "新建跳转" : lang === "ko" ? "새 이동" : "New route",\n    hint: lang === "ja" ? "丸い接続点を別の画面へドラッグ" : lang === "zh" ? "将连接点拖到另一个画面" : lang === "ko" ? "연결점을 다른 화면으로 드래그" : "Drag a connector to another screen",\n    choose: lang === "ja" ? "何をトリガーにしますか？" : lang === "zh" ? "选择触发方式" : lang === "ko" ? "트리거를 선택하세요" : "Choose a trigger",\n    cancel: lang === "ja" ? "キャンセル" : lang === "zh" ? "取消" : lang === "ko" ? "취소" : "Cancel",\n    item: lang === "ja" ? "タップ" : lang === "zh" ? "点击" : lang === "ko" ? "탭" : "Tap",\n    slot: lang === "ja" ? "項目" : lang === "zh" ? "项目" : lang === "ko" ? "항목" : "Slot",\n    swipe: lang === "ja" ? "スワイプ" : lang === "zh" ? "滑动" : lang === "ko" ? "스와이프" : "Swipe",\n    button: lang === "ja" ? "新しいボタンを追加" : lang === "zh" ? "添加新按钮" : lang === "ko" ? "새 버튼 추가" : "Add a new button",\n  };\n  const triggerLabel = (trigger: NavigationRouteTrigger) => {\n    if (trigger.kind === "item") return `${routeCopy.item}: ${trigger.label}`;\n    if (trigger.kind === "slot") return `${routeCopy.slot}: ${trigger.label}`;\n    if (trigger.kind === "swipe") return `${routeCopy.swipe}: ${trigger.label}`;\n    return routeCopy.button;\n  };''',
)

# Mark graph node target and add connector handle after preview button.
replace_once(
    "components/NavigationGraph.tsx",
    '                  data-testid={`graph-node-${node.frameId}`}\n                  style={{',
    '                  data-testid={`graph-node-${node.frameId}`}\n                  data-graph-frame-id={node.frameId}\n                  style={{',
)
node_preview = '''                  <button\n                    type="button"\n                    onClick={(event) => {\n                      event.stopPropagation();\n                      onPreviewFrame(node.frameId);\n                    }}\n                    aria-label={`${copy.preview}: ${node.label}`}\n                    title={copy.preview}\n                    className="m3-press"\n                    style={{ position: "absolute", right: 8, top: 8, width: 34, height: 34, border: "none", borderRadius: 17, background: active ? p.primary : p.surfaceContainerHighest, color: active ? p.onPrimary : p.onSurfaceVariant, display: "grid", placeItems: "center", cursor: "pointer" }}\n                  >\n                    <Icon name="play_arrow" size={20} />\n                  </button>'''
node_preview_new = node_preview + '''\n                  <button\n                    type="button"\n                    data-testid={`graph-connect-${node.frameId}`}\n                    aria-label={`${routeCopy.create}: ${node.label}`}\n                    title={routeCopy.hint}\n                    onPointerDown={(event) => {\n                      event.preventDefault();\n                      event.stopPropagation();\n                      event.currentTarget.setPointerCapture(event.pointerId);\n                      setSelectedEdgeId(null);\n                      setRouteDrag({ sourceFrameId: node.frameId, x0: event.clientX, y0: event.clientY, x1: event.clientX, y1: event.clientY });\n                    }}\n                    onPointerMove={(event) => {\n                      if (!routeDrag || routeDrag.sourceFrameId !== node.frameId) return;\n                      setRouteDrag({ ...routeDrag, x1: event.clientX, y1: event.clientY });\n                    }}\n                    onPointerUp={(event) => {\n                      if (!routeDrag || routeDrag.sourceFrameId !== node.frameId) return;\n                      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-graph-frame-id]")?.dataset.graphFrameId;\n                      if (target) setPendingRoute({ sourceFrameId: node.frameId, targetFrameId: target });\n                      setRouteDrag(null);\n                    }}\n                    className="m3-press"\n                    style={{ position: "absolute", right: -11, top: "50%", marginTop: -11, width: 22, height: 22, borderRadius: 11, border: `3px solid ${p.surface}`, background: p.primary, cursor: "crosshair", zIndex: 3 }}\n                  />'''
replace_once("components/NavigationGraph.tsx", node_preview, node_preview_new)

# Fixed drag line and chooser before footer.
replace_once(
    "components/NavigationGraph.tsx",
    "      <footer\n",
    '''      {routeDrag && (\n        <svg aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 110, pointerEvents: "none" }}>\n          <line x1={routeDrag.x0} y1={routeDrag.y0} x2={routeDrag.x1} y2={routeDrag.y1} stroke={p.primary} strokeWidth={4} strokeLinecap="round" strokeDasharray="8 6" />\n        </svg>\n      )}\n      {pendingRoute && (\n        <div data-testid="graph-route-trigger-chooser" style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.28)", display: "grid", placeItems: "end center", padding: "16px max(12px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))" }}>\n          <div role="dialog" aria-label={routeCopy.choose} style={{ width: "min(560px, 100%)", maxHeight: "70vh", overflow: "auto", borderRadius: 26, padding: 16, background: p.surfaceContainerHigh, color: p.onSurface, boxShadow: "0 18px 50px rgba(0,0,0,.24)" }}>\n            <div style={{ fontSize: 18, fontWeight: 800 }}>{routeCopy.choose}</div>\n            <div style={{ marginTop: 5, fontSize: 12, color: p.onSurfaceVariant }}>{labelById.get(pendingRoute.sourceFrameId) ?? pendingRoute.sourceFrameId} → {labelById.get(pendingRoute.targetFrameId) ?? pendingRoute.targetFrameId}</div>\n            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>\n              {pendingTriggers.map((trigger, index) => (\n                <button\n                  type="button"\n                  key={`${trigger.kind}-${"itemId" in trigger ? trigger.itemId : "swipe" in trigger ? trigger.swipe : "new"}-${"slot" in trigger ? trigger.slot : index}`}\n                  onClick={() => { onCreateRoute(pendingRoute.sourceFrameId, pendingRoute.targetFrameId, trigger); setPendingRoute(null); }}\n                  className="m3-press"\n                  style={{ minHeight: 48, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, padding: "0 14px", background: p.surface, color: p.onSurface, textAlign: "left", fontWeight: 750, cursor: "pointer" }}\n                >\n                  {triggerLabel(trigger)}\n                </button>\n              ))}\n            </div>\n            <button type="button" onClick={() => setPendingRoute(null)} style={{ marginTop: 12, minHeight: 44, border: "none", borderRadius: 22, padding: "0 16px", background: "transparent", color: p.primary, fontWeight: 800, cursor: "pointer" }}>{routeCopy.cancel}</button>\n          </div>\n        </div>\n      )}\n\n      <footer\n''',
)

# Page import/create handler.
replace_once(
    "app/page.tsx",
    'import { editNavigationEdge } from "@/lib/navigation-graph-edit";\n',
    'import { createNavigationRoute, editNavigationEdge } from "@/lib/navigation-graph-edit";\n',
)
replace_once(
    "app/page.tsx",
    '''            onEditEdge={(edge, patch) => {\n              const result = editNavigationEdge(doc, edge, patch);\n              if (!result) return;\n              snapshot();\n              setFrames(result.frames);\n              setGroups(result.groups);\n            }}\n            onClose={() => setGraphOpen(false)}''',
    '''            onEditEdge={(edge, patch) => {\n              const result = editNavigationEdge(doc, edge, patch);\n              if (!result) return;\n              snapshot();\n              setFrames(result.frames);\n              setGroups(result.groups);\n            }}\n            onCreateRoute={(sourceFrameId, targetFrameId, trigger) => {\n              const result = createNavigationRoute(doc, widthsRef.current, sourceFrameId, targetFrameId, trigger);\n              if (!result) return;\n              snapshot();\n              setFrames(result.frames);\n              setGroups(result.groups);\n            }}\n            onClose={() => setGraphOpen(false)}''',
)

# E2E: drag-create a swipe route between existing frames.
e2e = Path("e2e/core.e2e.ts")
text = e2e.read_text()
if 'test("navigation graph drag creates a route through a chosen trigger"' not in text:
    text += '''\n\ntest("navigation graph drag creates a route through a chosen trigger", async ({ page }) => {\n  await openSeeded(page);\n  await page.getByTitle("Screen flow").click();\n  const graph = page.getByTestId("navigation-graph");\n  const source = graph.getByTestId("graph-connect-home");\n  const target = graph.getByTestId("graph-node-details");\n  const a = await source.boundingBox();\n  const b = await target.boundingBox();\n  if (!a || !b) throw new Error("graph nodes are not visible");\n  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);\n  await page.mouse.down();\n  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });\n  await page.mouse.up();\n\n  const chooser = page.getByTestId("graph-route-trigger-chooser");\n  await expect(chooser).toBeVisible();\n  await chooser.getByRole("button", { name: /Swipe:/ }).first().click();\n  await expect(chooser).toBeHidden();\n  await expect.poll(async () =>\n    page.evaluate(() => {\n      const raw = localStorage.getItem("m3e:doc");\n      const swipe = raw ? JSON.parse(raw).frames?.find((frame: { id: string }) => frame.id === "home")?.swipe : null;\n      return swipe ? Object.values(swipe).includes("details") : false;\n    }),\n  ).toBe(true);\n});\n'''
    e2e.write_text(text)

print("navigation route drag creation integrated")
