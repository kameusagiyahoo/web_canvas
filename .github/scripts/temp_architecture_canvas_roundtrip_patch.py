from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "components/ArchitectureFlow.tsx",
    '''                {canvasTraceItem && canvasTraceBindingState.boundActions.length === 1 && (\n                  <span data-testid="architecture-canvas-trace-context" style={{ fontSize: 11, fontWeight: 850, color: p.onSecondaryContainer, background: p.secondaryContainer, borderRadius: 12, padding: "4px 8px" }}>{copy.canvasTraceSource}: {canvasTraceItem.screenName ? `${canvasTraceItem.screenName} · ` : ""}{canvasTraceItem.label} →</span>\n                )}\n''',
    '''                {canvasTraceItem && canvasTraceBindingState.boundActions.length === 1 && (\n                  <>\n                    <button\n                      type="button"\n                      data-testid="architecture-canvas-trace-context"\n                      onClick={() => onOpenCanvasItem(canvasTraceItem.id)}\n                      aria-label={`${copy.openCanvasSource}: ${canvasTraceItem.screenName ? `${canvasTraceItem.screenName} · ` : ""}${canvasTraceItem.label}`}\n                      title={copy.openCanvasSource}\n                      className="m3-press"\n                      style={{ border: "none", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 850, color: p.onSecondaryContainer, background: p.secondaryContainer, borderRadius: 12, padding: "4px 8px", cursor: "pointer" }}\n                    >\n                      <span>{copy.canvasTraceSource}: {canvasTraceItem.screenName ? `${canvasTraceItem.screenName} · ` : ""}{canvasTraceItem.label}</span>\n                      <Icon name="open_in_new" size={14} />\n                    </button>\n                    <span aria-hidden style={{ fontSize: 12, fontWeight: 900, color: p.onSurfaceVariant }}>→</span>\n                  </>\n                )}\n''',
)

replace_once(
    "e2e/core.e2e.ts",
    '''test("architecture Quick flow previews and transfers Canvas ownership as one undo step", async ({ page }) => {\n  await openSeeded(page);\n  await page.getByTitle("App architecture").click();\n  const architecture = page.getByTestId("architecture-flow");\n''',
    '''test("architecture Quick flow previews and transfers Canvas ownership as one undo step", async ({ page }) => {\n  await openSeeded(page);\n  await page.getByTitle("App architecture").click();\n  const architecture = page.getByTestId("architecture-flow");\n''',
)

replace_once(
    "e2e/core.e2e.ts",
    '''  })).toEqual({ createdSource: "go-details", existingSource: "", nodes: 3, edges: 3 });\n  await expect.poll(() => page.evaluate(() => {\n''',
    '''  })).toEqual({ createdSource: "go-details", existingSource: "", nodes: 3, edges: 3 });\n  const createdActionId = await page.evaluate(() => {\n    const raw = localStorage.getItem("m3e:doc");\n    const flow = raw ? JSON.parse(raw).architecture : null;\n    return flow?.nodes?.find((node: { kind?: string; name?: string }) => node.kind === "action" && node.name === "Load details")?.id as string;\n  });\n  expect(createdActionId).toBeTruthy();\n  await expect.poll(() => page.evaluate(() => {\n''',
)

replace_once(
    "e2e/core.e2e.ts",
    '''  await expect(architecture.getByTestId("architecture-canvas-trace-context")).toContainText("Canvas: Home · Go details →");\n  await expect(actionNode).toHaveAttribute("data-relation", "focus");\n''',
    '''  const traceContext = architecture.getByTestId("architecture-canvas-trace-context");\n  await expect(traceContext).toContainText("Canvas: Home · Go details");\n  await expect(traceContext).toHaveAttribute("title", "Open in Canvas");\n  await expect(actionNode).toHaveAttribute("data-relation", "focus");\n''',
)

replace_once(
    "e2e/core.e2e.ts",
    '''  await architecture.getByTestId("architecture-clear-relation-focus").click();\n  await expect(canvasTrace).toHaveValue("");\n  await expect(architecture.getByTestId("architecture-graph-relation-summary")).toHaveCount(0);\n\n  await architecture.getByRole("button", { name: "Close", exact: true }).click();\n''',
    '''  await architecture.getByTestId("architecture-clear-relation-focus").click();\n  await expect(canvasTrace).toHaveValue("");\n  await expect(architecture.getByTestId("architecture-graph-relation-summary")).toHaveCount(0);\n\n  await canvasTrace.selectOption("go-details");\n  await traceContext.click();\n  await expect(architecture).toBeHidden();\n  const inspectorAction = page.getByTestId("inspector-architecture-action");\n  await expect(inspectorAction).toHaveValue(createdActionId);\n  await expect(inspectorAction.locator(`option[value="${createdActionId}"]`)).toHaveText("Load details");\n\n  await page.getByTestId("inspector-open-architecture-action").click();\n  await expect(architecture).toBeVisible();\n  await expect(architecture.getByTestId(`architecture-graph-node-action-${createdActionId}`)).toBeFocused();\n\n  await architecture.getByRole("button", { name: "Close", exact: true }).click();\n''',
)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    "A Canvas trace selector can start the same view-only relation focus from a Canvas part: a uniquely bound part focuses its owning Action and therefore exposes the Canvas → Action → downstream API/Screen chain, while unbound parts and legacy duplicate owners are surfaced without guessing an Action. This relation focus is derived at runtime and never stored in the project.",
    "A Canvas trace selector can start the same view-only relation focus from a Canvas part: a uniquely bound part focuses its owning Action and therefore exposes the Canvas → Action → downstream API/Screen chain, while unbound parts and legacy duplicate owners are surfaced without guessing an Action. The focused Canvas context is also an explicit handoff back to that real Canvas Item and its Inspector, reusing the same Architecture → Canvas path as Action cards; the Inspector can then jump back to the owning Action. This relation focus is derived at runtime and never stored in the project.",
)

replace_once(
    "docs/TODO.md",
    "- [x] Trace Architecture relations from a Canvas part through its bound Action to downstream API/Screen nodes as view-only state, without guessing through binding conflicts.\n",
    "- [x] Trace Architecture relations from a Canvas part through its bound Action to downstream API/Screen nodes as view-only state, without guessing through binding conflicts.\n- [x] Make the traced Canvas context jump back to the real Canvas Item/Inspector and preserve the existing Inspector → Architecture round-trip without adding persisted view state.\n",
)
