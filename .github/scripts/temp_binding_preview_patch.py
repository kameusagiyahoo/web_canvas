from pathlib import Path


def replace_once(path: str, old: str, new: str):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1))


path = "components/ArchitectureFlow.tsx"
replace_once(
    path,
    'import { fitGraphZoom, graphCenterScroll, stepGraphZoom } from "@/lib/graph-viewport";',
    'import { fitGraphZoom, graphCenterScroll, stepGraphZoom } from "@/lib/graph-viewport";\nimport { getArchitectureCanvasBindingState } from "@/lib/architecture-binding";',
)
replace_once(
    path,
    '    quickNoCanvasSource: lang === "ja" ? "Canvas部品と未接続" : "No Canvas part binding",',
    '    quickNoCanvasSource: lang === "ja" ? "Canvas部品と未接続" : "No Canvas part binding",\n    quickCanvasOwner: lang === "ja" ? "現在のAction" : "Current Action",\n    quickCanvasOwners: lang === "ja" ? "現在のActions" : "Current Actions",\n    quickCanvasWillMove: lang === "ja" ? "作成すると、この部品の関連付けは新しいActionへ移ります。" : "Creating this flow moves the Canvas binding to the new Action.",\n    quickCanvasWillResolveConflict: lang === "ja" ? "この部品は複数Actionに重複割当されています。作成すると新しいActionへ一本化されます。" : "This Canvas part is assigned to multiple Actions. Creating this flow resolves ownership to the new Action.",',
)
replace_once(
    path,
    '  const actionNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "action"), [flow.nodes]);\n  const apiNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "api"), [flow.nodes]);',
    '  const actionNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "action"), [flow.nodes]);\n  const quickSourceBindingState = useMemo(\n    () => getArchitectureCanvasBindingState(actionNodes, quickSourceItemId),\n    [actionNodes, quickSourceItemId],\n  );\n  const apiNodes = useMemo(() => flow.nodes.filter((node) => node.kind === "api"), [flow.nodes]);',
)
replace_once(
    path,
    '                {quickSourceItems.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}',
    '''                {quickSourceItems.map((item) => {
                  const binding = getArchitectureCanvasBindingState(actionNodes, item.id);
                  const ownerSuffix = binding.boundActions.length === 1
                    ? ` · ${binding.boundActions[0].name}`
                    : binding.boundActions.length > 1
                      ? ` · ${binding.boundActions.length} Actions`
                      : "";
                  return <option key={item.id} value={item.id}>{item.label}{ownerSuffix}</option>;
                })}''',
)
replace_once(
    path,
    '''              </select>
              <input data-testid="architecture-quick-action" aria-label={copy.actionName} placeholder={copy.actionName} value={quickActionName}''',
    '''              </select>
              {quickSourceBindingState.boundActions.length > 0 && (
                <div
                  data-testid="architecture-quick-canvas-binding-preview"
                  role="status"
                  style={{
                    gridColumn: "1 / -1",
                    borderRadius: 14,
                    border: `1px solid ${quickSourceBindingState.conflicted ? p.error : p.outlineVariant}`,
                    background: quickSourceBindingState.conflicted ? p.errorContainer : p.secondaryContainer,
                    color: quickSourceBindingState.conflicted ? p.onErrorContainer : p.onSecondaryContainer,
                    padding: "9px 11px",
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  <strong>{quickSourceBindingState.conflicted ? copy.quickCanvasOwners : copy.quickCanvasOwner}:</strong>{" "}
                  {quickSourceBindingState.boundActions.map((action) => action.name).join(", ")}.{" "}
                  {quickSourceBindingState.conflicted ? copy.quickCanvasWillResolveConflict : copy.quickCanvasWillMove}
                </div>
              )}
              <input data-testid="architecture-quick-action" aria-label={copy.actionName} placeholder={copy.actionName} value={quickActionName}''',
)

path = "e2e/core.e2e.ts"
old_test = '''test("architecture Quick flow creates Screen Action API Screen as one undo step", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-quick-source").selectOption("home");
  const quickCanvasSource = architecture.getByTestId("architecture-quick-canvas-source");
  await expect(quickCanvasSource.locator('option[value="go-details"]')).toHaveCount(1);
  await expect(quickCanvasSource.locator('option[value="details-label"]')).toHaveCount(0);
  await quickCanvasSource.selectOption("go-details");
  await architecture.getByTestId("architecture-quick-action").fill("Load details");
  await architecture.getByTestId("architecture-quick-api-method").selectOption("GET");
  await architecture.getByTestId("architecture-quick-api-path").fill("/api/details");
  await architecture.getByTestId("architecture-quick-api-name").fill("Details API");
  await architecture.getByTestId("architecture-quick-target").selectOption("details");
  await architecture.getByTestId("architecture-quick-create").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Load details" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Details API" });
  await expect(actionNode).toHaveCount(1);
  await expect(apiNode).toHaveCount(1);
  await expect(actionNode).toBeFocused();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const flow = raw ? JSON.parse(raw).architecture : null;
    const action = flow?.nodes?.find((node: { kind?: string; name?: string }) => node.kind === "action" && node.name === "Load details");
    return action?.sourceItemId ?? "";
  })).toBe("go-details");
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const doc = raw ? JSON.parse(raw) : null;
    return doc?.groups?.[0]?.items?.[0]?.action?.to ?? "";
  })).toBe("details");

  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const flow = raw ? JSON.parse(raw).architecture : null;
    return { nodes: flow?.nodes?.length ?? 0, edges: flow?.edges?.length ?? 0 };
  })).toEqual({ nodes: 2, edges: 3 });

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const flow = raw ? JSON.parse(raw).architecture : null;
    return { nodes: flow?.nodes?.length ?? 0, edges: flow?.edges?.length ?? 0 };
  })).toEqual({ nodes: 0, edges: 0 });
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const doc = raw ? JSON.parse(raw) : null;
    return doc?.groups?.[0]?.items?.[0]?.action?.to ?? "";
  })).toBe("details");
});'''
new_test = '''test("architecture Quick flow previews and transfers Canvas ownership as one undo step", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  await architecture.getByTestId("architecture-action-name").fill("Existing owner");
  await architecture.getByTestId("architecture-add-action").click();
  await architecture.getByRole("combobox", { name: "Canvas source: Existing owner" }).selectOption("go-details");

  await architecture.getByTestId("architecture-quick-source").selectOption("home");
  const quickCanvasSource = architecture.getByTestId("architecture-quick-canvas-source");
  const goDetailsOption = quickCanvasSource.locator('option[value="go-details"]');
  await expect(goDetailsOption).toHaveCount(1);
  await expect(goDetailsOption).toContainText("Existing owner");
  await expect(quickCanvasSource.locator('option[value="details-label"]')).toHaveCount(0);
  await quickCanvasSource.selectOption("go-details");

  const bindingPreview = architecture.getByTestId("architecture-quick-canvas-binding-preview");
  await expect(bindingPreview).toContainText("Current Action: Existing owner");
  await expect(bindingPreview).toContainText("moves the Canvas binding to the new Action");

  await architecture.getByTestId("architecture-quick-action").fill("Load details");
  await architecture.getByTestId("architecture-quick-api-method").selectOption("GET");
  await architecture.getByTestId("architecture-quick-api-path").fill("/api/details");
  await architecture.getByTestId("architecture-quick-api-name").fill("Details API");
  await architecture.getByTestId("architecture-quick-target").selectOption("details");
  await architecture.getByTestId("architecture-quick-create").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Load details" });
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Details API" });
  await expect(actionNode).toHaveCount(1);
  await expect(apiNode).toHaveCount(1);
  await expect(actionNode).toBeFocused();
  await expect(architecture.locator('[data-testid^="architecture-graph-link-"]')).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const flow = raw ? JSON.parse(raw).architecture : null;
    const created = flow?.nodes?.find((node: { kind?: string; name?: string }) => node.kind === "action" && node.name === "Load details");
    const existing = flow?.nodes?.find((node: { kind?: string; name?: string }) => node.kind === "action" && node.name === "Existing owner");
    return {
      createdSource: created?.sourceItemId ?? "",
      existingSource: existing?.sourceItemId ?? "",
      nodes: flow?.nodes?.length ?? 0,
      edges: flow?.edges?.length ?? 0,
    };
  })).toEqual({ createdSource: "go-details", existingSource: "", nodes: 3, edges: 3 });
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const doc = raw ? JSON.parse(raw) : null;
    return doc?.groups?.[0]?.items?.[0]?.action?.to ?? "";
  })).toBe("details");

  await architecture.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByTitle("Undo").click();
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const flow = raw ? JSON.parse(raw).architecture : null;
    const existing = flow?.nodes?.find((node: { kind?: string; name?: string }) => node.kind === "action" && node.name === "Existing owner");
    return {
      existingSource: existing?.sourceItemId ?? "",
      nodes: flow?.nodes?.length ?? 0,
      edges: flow?.edges?.length ?? 0,
    };
  })).toEqual({ existingSource: "go-details", nodes: 1, edges: 0 });
  await expect.poll(() => page.evaluate(() => {
    const raw = localStorage.getItem("m3e:doc");
    const doc = raw ? JSON.parse(raw) : null;
    return doc?.groups?.[0]?.items?.[0]?.action?.to ?? "";
  })).toBe("details");
});'''
replace_once(path, old_test, new_test)

path = "docs/TODO.md"
replace_once(
    path,
    '- [x] Let Architecture Quick flow optionally bind a Canvas part from the start Screen to the new Action in the same Undo operation, without changing navigation.',
    '- [x] Let Architecture Quick flow optionally bind a Canvas part from the start Screen to the new Action in the same Undo operation, without changing navigation.\n- [x] Preview existing Action ownership before Quick flow rebinds a Canvas part, including legacy duplicate ownership, without mutating the document.',
)

path = "docs/ARCHITECTURE_FLOW.md"
replace_once(
    path,
    'It can optionally bind one existing Canvas part owned by the start Screen to the new Action; that binding uses the same exclusive ownership rule as the Inspectors, so an existing Action owner is released inside the same command.',
    'It can optionally bind one existing Canvas part owned by the start Screen to the new Action. The selector annotates parts that already have Action owners, and selecting one shows a non-mutating ownership preview before creation; legacy duplicate owners are all named as a conflict. The binding uses the same exclusive ownership rule as the Inspectors, so existing Action ownership is released inside the same command.',
)
