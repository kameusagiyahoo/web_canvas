from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

# Navigation command: accept an explicit transition while keeping slide as the default.
replace_once(
    "lib/navigation-graph-edit.ts",
    '''  targetFrameId: string,\n  trigger: NavigationRouteTrigger,\n): NavigationEditResult | null {''',
    '''  targetFrameId: string,\n  trigger: NavigationRouteTrigger,\n  transition: Transition = "slide",\n): NavigationEditResult | null {''',
)
replace_once(
    "lib/navigation-graph-edit.ts",
    '''      action: { to: targetFrameId, transition: "slide" as Transition },''',
    '''      action: { to: targetFrameId, transition },''',
)
replace_once(
    "lib/navigation-graph-edit.ts",
    '''          return { ...item, action: { to: targetFrameId, transition: "slide" as Transition } };''',
    '''          return { ...item, action: { to: targetFrameId, transition } };''',
)
replace_once(
    "lib/navigation-graph-edit.ts",
    '''            [trigger.slot]: { to: targetFrameId, transition: "slide" as Transition },''',
    '''            [trigger.slot]: { to: targetFrameId, transition },''',
)

# Component: expose transition selection for newly-created and existing tap/slot routes.
replace_once(
    "components/NavigationGraph.tsx",
    'import { BACK_TARGET, type Doc, type Palette } from "@/lib/tokens";\n',
    'import { BACK_TARGET, TRANSITIONS, type Doc, type Palette, type Transition } from "@/lib/tokens";\n',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''  onCreateRoute: (sourceFrameId: string, targetFrameId: string, trigger: NavigationRouteTrigger) => void;''',
    '''  onCreateRoute: (sourceFrameId: string, targetFrameId: string, trigger: NavigationRouteTrigger, transition?: Transition) => void;''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''  const [pendingRoute, setPendingRoute] = useState<{ sourceFrameId: string; targetFrameId: string } | null>(null);''',
    '''  const [pendingRoute, setPendingRoute] = useState<{ sourceFrameId: string; targetFrameId: string } | null>(null);\n  const [pendingTrigger, setPendingTrigger] = useState<NavigationRouteTrigger | null>(null);''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''      if (target) setPendingRoute({ sourceFrameId, targetFrameId: target });\n      setRouteDrag(null);''',
    '''      if (target) {\n        setPendingTrigger(null);\n        setPendingRoute({ sourceFrameId, targetFrameId: target });\n      }\n      setRouteDrag(null);''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''    back: lang === "ja" ? "戻る" : lang === "zh" ? "返回" : lang === "ko" ? "뒤로" : "Back",\n  };''',
    '''    back: lang === "ja" ? "戻る" : lang === "zh" ? "返回" : lang === "ko" ? "뒤로" : "Back",\n    transition: lang === "ja" ? "トランジション" : lang === "zh" ? "过渡效果" : lang === "ko" ? "전환 효과" : "Transition",\n  };''',
)
replace_once(
    "components/NavigationGraph.tsx",
    '''    button: lang === "ja" ? "新しいボタンを追加" : lang === "zh" ? "添加新按钮" : lang === "ko" ? "새 버튼 추가" : "Add a new button",\n  };''',
    '''    button: lang === "ja" ? "新しいボタンを追加" : lang === "zh" ? "添加新按钮" : lang === "ko" ? "새 버튼 추가" : "Add a new button",\n    transition: lang === "ja" ? "画面切り替え" : lang === "zh" ? "画面过渡" : lang === "ko" ? "화면 전환" : "Screen transition",\n    backToTrigger: lang === "ja" ? "トリガー選択に戻る" : lang === "zh" ? "返回触发方式" : lang === "ko" ? "트리거 선택으로 돌아가기" : "Back to trigger",\n  };''',
)
old_chooser = '''      {pendingRoute && (\n        <div data-testid="graph-route-trigger-chooser" style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.28)", display: "grid", placeItems: "end center", padding: "16px max(12px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))" }}>\n          <div role="dialog" aria-label={routeCopy.choose} style={{ width: "min(560px, 100%)", maxHeight: "70vh", overflow: "auto", borderRadius: 26, padding: 16, background: p.surfaceContainerHigh, color: p.onSurface, boxShadow: "0 18px 50px rgba(0,0,0,.24)" }}>\n            <div style={{ fontSize: 18, fontWeight: 800 }}>{routeCopy.choose}</div>\n            <div style={{ marginTop: 5, fontSize: 12, color: p.onSurfaceVariant }}>{labelById.get(pendingRoute.sourceFrameId) ?? pendingRoute.sourceFrameId} → {labelById.get(pendingRoute.targetFrameId) ?? pendingRoute.targetFrameId}</div>\n            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>\n              {pendingTriggers.map((trigger, index) => (\n                <button\n                  type="button"\n                  key={`${trigger.kind}-${"itemId" in trigger ? trigger.itemId : "swipe" in trigger ? trigger.swipe : "new"}-${"slot" in trigger ? trigger.slot : index}`}\n                  onClick={() => { onCreateRoute(pendingRoute.sourceFrameId, pendingRoute.targetFrameId, trigger); setPendingRoute(null); }}\n                  className="m3-press"\n                  style={{ minHeight: 48, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, padding: "0 14px", background: p.surface, color: p.onSurface, textAlign: "left", fontWeight: 750, cursor: "pointer" }}\n                >\n                  {triggerLabel(trigger)}\n                </button>\n              ))}\n            </div>\n            <button type="button" onClick={() => setPendingRoute(null)} style={{ marginTop: 12, minHeight: 44, border: "none", borderRadius: 22, padding: "0 16px", background: "transparent", color: p.primary, fontWeight: 800, cursor: "pointer" }}>{routeCopy.cancel}</button>\n          </div>\n        </div>\n      )}'''
new_chooser = '''      {pendingRoute && (\n        <div data-testid={pendingTrigger ? "graph-route-transition-chooser" : "graph-route-trigger-chooser"} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.28)", display: "grid", placeItems: "end center", padding: "16px max(12px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))" }}>\n          <div role="dialog" aria-label={pendingTrigger ? routeCopy.transition : routeCopy.choose} style={{ width: "min(560px, 100%)", maxHeight: "70vh", overflow: "auto", borderRadius: 26, padding: 16, background: p.surfaceContainerHigh, color: p.onSurface, boxShadow: "0 18px 50px rgba(0,0,0,.24)" }}>\n            <div style={{ fontSize: 18, fontWeight: 800 }}>{pendingTrigger ? routeCopy.transition : routeCopy.choose}</div>\n            <div style={{ marginTop: 5, fontSize: 12, color: p.onSurfaceVariant }}>{labelById.get(pendingRoute.sourceFrameId) ?? pendingRoute.sourceFrameId} → {labelById.get(pendingRoute.targetFrameId) ?? pendingRoute.targetFrameId}{pendingTrigger ? ` · ${triggerLabel(pendingTrigger)}` : ""}</div>\n            {!pendingTrigger ? (\n              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>\n                {pendingTriggers.map((trigger, index) => (\n                  <button\n                    type="button"\n                    key={`${trigger.kind}-${"itemId" in trigger ? trigger.itemId : "swipe" in trigger ? trigger.swipe : "new"}-${"slot" in trigger ? trigger.slot : index}`}\n                    onClick={() => {\n                      if (trigger.kind === "swipe") {\n                        onCreateRoute(pendingRoute.sourceFrameId, pendingRoute.targetFrameId, trigger);\n                        setPendingRoute(null);\n                      } else {\n                        setPendingTrigger(trigger);\n                      }\n                    }}\n                    className="m3-press"\n                    style={{ minHeight: 48, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, padding: "0 14px", background: p.surface, color: p.onSurface, textAlign: "left", fontWeight: 750, cursor: "pointer" }}\n                  >\n                    {triggerLabel(trigger)}\n                  </button>\n                ))}\n              </div>\n            ) : (\n              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 14 }}>\n                {TRANSITIONS.map((transition) => (\n                  <button\n                    type="button"\n                    key={transition.key}\n                    onClick={() => {\n                      onCreateRoute(pendingRoute.sourceFrameId, pendingRoute.targetFrameId, pendingTrigger, transition.key);\n                      setPendingTrigger(null);\n                      setPendingRoute(null);\n                    }}\n                    className="m3-press"\n                    style={{ minHeight: 48, border: `1px solid ${p.outlineVariant}`, borderRadius: 16, padding: "0 14px", background: p.surface, color: p.onSurface, textAlign: "left", fontWeight: 750, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}\n                  >\n                    <Icon name={transition.icon} size={20} />\n                    {transition.label}\n                  </button>\n                ))}\n              </div>\n            )}\n            <button type="button" onClick={() => pendingTrigger ? setPendingTrigger(null) : setPendingRoute(null)} style={{ marginTop: 12, minHeight: 44, border: "none", borderRadius: 22, padding: "0 16px", background: "transparent", color: p.primary, fontWeight: 800, cursor: "pointer" }}>{pendingTrigger ? routeCopy.backToTrigger : routeCopy.cancel}</button>\n          </div>\n        </div>\n      )}'''
replace_once("components/NavigationGraph.tsx", old_chooser, new_chooser)

# Existing edge editor gets transition control for item/slot routes.
select_anchor = '''            </label>\n            <button\n              type="button"\n              onClick={() => onEditEdge(selectedEdge, { remove: true })}'''
select_with_transition = '''            </label>\n            {selectedEdge.source !== "swipe" && (\n              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>\n                {editCopy.transition}\n                <select\n                  aria-label={editCopy.transition}\n                  value={selectedEdge.transition ?? "slide"}\n                  onChange={(event) => onEditEdge(selectedEdge, { transition: event.target.value as Transition })}\n                  style={{ minHeight: 34, maxWidth: 180, borderRadius: 10, border: `1px solid ${p.outlineVariant}`, background: p.surface, color: p.onSurface, padding: "0 8px" }}\n                >\n                  {TRANSITIONS.map((transition) => (\n                    <option key={transition.key} value={transition.key}>{transition.label}</option>\n                  ))}\n                </select>\n              </label>\n            )}\n            <button\n              type="button"\n              onClick={() => onEditEdge(selectedEdge, { remove: true })}'''
replace_once("components/NavigationGraph.tsx", select_anchor, select_with_transition)

# Page handler forwards the transition chosen in the graph.
replace_once(
    "app/page.tsx",
    '''            onCreateRoute={(sourceFrameId, targetFrameId, trigger) => {\n              const result = createNavigationRoute(doc, widthsRef.current, sourceFrameId, targetFrameId, trigger);''',
    '''            onCreateRoute={(sourceFrameId, targetFrameId, trigger, transition) => {\n              const result = createNavigationRoute(doc, widthsRef.current, sourceFrameId, targetFrameId, trigger, transition);''',
)

# Unit coverage for explicit transition choice.
test_path = Path("lib/navigation-graph-create.test.ts")
test_text = test_path.read_text()
anchor = '''  it("creates an item route without graph-owned state", () => {\n    const result = createNavigationRoute(\n      { frames, groups: groups() },\n      {},\n      "home",\n      "detail",\n      { kind: "item", itemId: "open", label: "Open" },\n    );\n    expect(result?.groups[0].items[0].action).toEqual({ to: "detail", transition: "slide" });\n  });\n'''
addition = anchor + '''\n  it("creates an item route with the selected transition", () => {\n    const result = createNavigationRoute(\n      { frames, groups: groups() },\n      {},\n      "home",\n      "detail",\n      { kind: "item", itemId: "open", label: "Open" },\n      "fade",\n    );\n    expect(result?.groups[0].items[0].action).toEqual({ to: "detail", transition: "fade" });\n  });\n'''
if anchor not in test_text:
    raise SystemExit("unit test anchor not found")
test_path.write_text(test_text.replace(anchor, addition, 1))

# E2E coverage: create a tap route with Fade and verify undo/redo shares history.
e2e = Path("e2e/core.e2e.ts")
text = e2e.read_text()
if 'test("navigation graph creation supports transitions and undo redo"' not in text:
    text += '''\n\ntest("navigation graph creation supports transitions and undo redo", async ({ page }) => {\n  await openSeeded(page);\n  await page.getByTitle("Screen flow").click();\n  const graph = page.getByTestId("navigation-graph");\n  const source = graph.getByTestId("graph-connect-details");\n  const target = graph.getByTestId("graph-node-home");\n  const a = await source.boundingBox();\n  const b = await target.boundingBox();\n  if (!a || !b) throw new Error("graph nodes are not visible");\n  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);\n  await page.mouse.down();\n  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });\n  await page.mouse.up();\n\n  const triggerChooser = page.getByTestId("graph-route-trigger-chooser");\n  await expect(triggerChooser).toBeVisible();\n  await triggerChooser.getByRole("button", { name: "Tap: Details page" }).click();\n  const transitionChooser = page.getByTestId("graph-route-transition-chooser");\n  await expect(transitionChooser).toBeVisible();\n  await transitionChooser.getByRole("button", { name: "Fade" }).click();\n\n  const storedTransition = () => page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    return raw ? JSON.parse(raw).groups?.[1]?.items?.[0]?.action?.transition ?? null : null;\n  });\n  await expect.poll(storedTransition).toBe("fade");\n\n  await graph.getByRole("button", { name: "Close" }).click();\n  await page.getByTitle("Undo").click();\n  await expect.poll(storedTransition).toBeNull();\n  await page.getByTitle("Redo").click();\n  await expect.poll(storedTransition).toBe("fade");\n});\n'''
    e2e.write_text(text)

print("navigation transition selection integrated")
