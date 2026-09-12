from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, found {count}")
    file.write_text(text.replace(old, new, 1))


# Model-level integrity: imported JSON can bypass the normal one-Item/one-Action binding helper.
replace_once(
    "lib/architecture-flow.ts",
    '''  | "missing-target-endpoint"\n  | "missing-canvas-source";''',
    '''  | "missing-target-endpoint"\n  | "missing-canvas-source"\n  | "duplicate-canvas-source";''',
)

replace_once(
    "lib/architecture-flow.ts",
    '''  /** Stale Canvas-source bindings preserve the missing Item id for explicit repair. */\n  missingSourceItemId?: string;\n};''',
    '''  /** Stale Canvas-source bindings preserve the missing Item id for explicit repair. */\n  missingSourceItemId?: string;\n  /** Duplicate Canvas-source diagnostics preserve the shared Item id for explicit repair. */\n  sourceItemId?: string;\n};''',
)

replace_once(
    "lib/architecture-flow.ts",
    '''export function diagnoseArchitectureCanvasBindings(\n  flow: ArchitectureFlow,\n  knownCanvasItemIds: ReadonlySet<string>,\n): ArchitectureDiagnostic[] {\n  const diagnostics: ArchitectureDiagnostic[] = [];\n  for (const node of flow.nodes) {\n    if (node.kind !== "action" || !node.sourceItemId || knownCanvasItemIds.has(node.sourceItemId)) continue;\n    diagnostics.push({\n      id: `missing-canvas-source-${node.id}`,\n      kind: "missing-canvas-source",\n      severity: "error",\n      endpoint: { kind: "action", id: node.id },\n      missingSourceItemId: node.sourceItemId,\n    });\n  }\n  return diagnostics;\n}''',
    '''export function diagnoseArchitectureCanvasBindings(\n  flow: ArchitectureFlow,\n  knownCanvasItemIds: ReadonlySet<string>,\n): ArchitectureDiagnostic[] {\n  const diagnostics: ArchitectureDiagnostic[] = [];\n  const ownersByItemId = new Map<string, ArchitectureActionNode[]>();\n\n  for (const node of flow.nodes) {\n    if (node.kind !== "action" || !node.sourceItemId) continue;\n    if (!knownCanvasItemIds.has(node.sourceItemId)) {\n      diagnostics.push({\n        id: `missing-canvas-source-${node.id}`,\n        kind: "missing-canvas-source",\n        severity: "error",\n        endpoint: { kind: "action", id: node.id },\n        missingSourceItemId: node.sourceItemId,\n      });\n      continue;\n    }\n    const owners = ownersByItemId.get(node.sourceItemId) ?? [];\n    owners.push(node);\n    ownersByItemId.set(node.sourceItemId, owners);\n  }\n\n  for (const [sourceItemId, owners] of ownersByItemId) {\n    if (owners.length < 2) continue;\n    for (const node of owners) {\n      diagnostics.push({\n        id: `duplicate-canvas-source-${sourceItemId}-${node.id}`,\n        kind: "duplicate-canvas-source",\n        severity: "error",\n        endpoint: { kind: "action", id: node.id },\n        sourceItemId,\n      });\n    }\n  }\n\n  return diagnostics;\n}''',
)

# UI: explain duplicate ownership and route diagnostics to the same explicit repair control.
replace_once(
    "components/ArchitectureFlow.tsx",
    '''    diagnosticsHint: lang === "ja" ? "Action/APIの接続漏れ・API重複・循環・削除済みノードへの接続・見つからないCanvas部品へのAction割当を検出します。" : "Detect Action/API connectivity problems, duplicate API endpoints, cycles, links to deleted endpoints, and Action bindings to missing Canvas parts.",''',
    '''    diagnosticsHint: lang === "ja" ? "Action/APIの接続漏れ・API重複・循環・削除済みノードへの接続・見つからない/重複したCanvas部品へのAction割当を検出します。" : "Detect Action/API connectivity problems, duplicate API endpoints, cycles, links to deleted endpoints, and missing or multiply assigned Canvas sources.",''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''      if (kind === "missing-canvas-source") return `Canvas部品が見つからないAction: ${name}${missingName ? ` (${missingName})` : ""}`;\n      return `循環しているノード: ${name}`;''',
    '''      if (kind === "missing-canvas-source") return `Canvas部品が見つからないAction: ${name}${missingName ? ` (${missingName})` : ""}`;\n      if (kind === "duplicate-canvas-source") return `同じCanvas部品が複数Actionに割り当てられています: ${name}${missingName ? ` (${missingName})` : ""}`;\n      return `循環しているノード: ${name}`;''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''    if (kind === "missing-canvas-source") return `Canvas source is missing for Action: ${name}${missingName ? ` (${missingName})` : ""}`;\n    return `Node participates in a cycle: ${name}`;''',
    '''    if (kind === "missing-canvas-source") return `Canvas source is missing for Action: ${name}${missingName ? ` (${missingName})` : ""}`;\n    if (kind === "duplicate-canvas-source") return `Canvas part is assigned to multiple Actions: ${name}${missingName ? ` (${missingName})` : ""}`;\n    return `Node participates in a cycle: ${name}`;''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''    if (diagnostic.kind === "missing-canvas-source") {''',
    '''    if (diagnostic.kind === "missing-canvas-source" || diagnostic.kind === "duplicate-canvas-source") {''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''                  const missingName = diagnostic.missingSourceItemId ?? (diagnostic.missingEndpoint\n                    ? labels.get(architectureEndpointKey(diagnostic.missingEndpoint)) ?? architectureEndpointKey(diagnostic.missingEndpoint)\n                    : undefined);''',
    '''                  const canvasSourceName = diagnostic.sourceItemId\n                    ? canvasItemsById.get(diagnostic.sourceItemId)?.label ?? diagnostic.sourceItemId\n                    : undefined;\n                  const missingName = diagnostic.missingSourceItemId ?? canvasSourceName ?? (diagnostic.missingEndpoint\n                    ? labels.get(architectureEndpointKey(diagnostic.missingEndpoint)) ?? architectureEndpointKey(diagnostic.missingEndpoint)\n                    : undefined);''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''                      <Icon name={diagnostic.kind === "cycle" ? "sync" : diagnostic.edgeId || diagnostic.kind === "missing-canvas-source" ? "link_off" : "warning"} size={18} />''',
    '''                      <Icon name={diagnostic.kind === "cycle" ? "sync" : diagnostic.edgeId || diagnostic.kind === "missing-canvas-source" || diagnostic.kind === "duplicate-canvas-source" ? "link_off" : "warning"} size={18} />''',
)

# Unit coverage for imported duplicate bindings and non-mutation.
replace_once(
    "lib/architecture-flow.test.ts",
    '''    expect(JSON.stringify(flow)).toBe(before);\n  });\n\n  it("marks every Action that participates in a directed cycle", () => {''',
    '''    expect(JSON.stringify(flow)).toBe(before);\n  });\n\n  it("reports every Action sharing one existing Canvas Item without changing the flow", () => {\n    const flow: ArchitectureFlow = {\n      version: 1,\n      nodes: [\n        { id: "validate", kind: "action", name: "Validate", sourceItemId: "login-button" },\n        { id: "submit", kind: "action", name: "Submit", sourceItemId: "login-button" },\n      ],\n      edges: [],\n    };\n    const before = JSON.stringify(flow);\n    expect(diagnoseArchitectureCanvasBindings(flow, new Set(["login-button"]))).toEqual([\n      {\n        id: "duplicate-canvas-source-login-button-validate",\n        kind: "duplicate-canvas-source",\n        severity: "error",\n        endpoint: { kind: "action", id: "validate" },\n        sourceItemId: "login-button",\n      },\n      {\n        id: "duplicate-canvas-source-login-button-submit",\n        kind: "duplicate-canvas-source",\n        severity: "error",\n        endpoint: { kind: "action", id: "submit" },\n        sourceItemId: "login-button",\n      },\n    ]);\n    expect(JSON.stringify(flow)).toBe(before);\n  });\n\n  it("marks every Action that participates in a directed cycle", () => {''',
)

# Browser regression: validator accepts imported duplicate refs, then Architecture diagnostics expose both owners.
replace_once(
    "e2e/core.e2e.ts",
    '''test("local project library creates and switches independent projects", async ({ page }) => {''',
    '''test("architecture diagnostics expose duplicate Canvas sources without mutating the document", async ({ page }) => {\n  const duplicateBindingDoc = {\n    ...seedDoc,\n    architecture: {\n      version: 1,\n      nodes: [\n        { id: "validate", kind: "action", name: "Validate login", sourceItemId: "go-details" },\n        { id: "track", kind: "action", name: "Track analytics", sourceItemId: "go-details" },\n      ],\n      edges: [\n        { id: "home-validate", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" } },\n        { id: "validate-details", from: { kind: "action", id: "validate" }, to: { kind: "frame", id: "details" } },\n        { id: "home-track", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "track" } },\n        { id: "track-details", from: { kind: "action", id: "track" }, to: { kind: "frame", id: "details" } },\n      ],\n    },\n  };\n  await page.addInitScript(({ doc }) => {\n    localStorage.setItem("m3e:doc", JSON.stringify(doc));\n    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));\n  }, { doc: duplicateBindingDoc });\n  await page.goto("/");\n  await expect(page.getByTitle("Undo")).toBeVisible();\n  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));\n\n  await page.getByTitle("App architecture").click();\n  const architecture = page.getByTestId("architecture-flow");\n  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("2");\n  await architecture.getByRole("button", { name: "Canvas part is assigned to multiple Actions: Validate login (Go details)" }).click();\n  await expect(architecture.getByTestId("architecture-action-source-validate")).toBeFocused();\n  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);\n});\n\n\ntest("local project library creates and switches independent projects", async ({ page }) => {''',
)

# Documentation reflects the actual one-to-one invariant and import-integrity diagnostics.
replace_once(
    "docs/TODO.md",
    '''- [x] Diagnose Architecture Action bindings that point to missing Canvas parts and jump directly to the repair control without mutating project data.\n''',
    '''- [x] Diagnose Architecture Action bindings that point to missing Canvas parts and jump directly to the repair control without mutating project data.\n- [x] Diagnose imported Architecture data that assigns one Canvas part to multiple Actions and route each conflict to explicit repair.\n''',
)

replace_once(
    "docs/ROADMAP.md",
    '''- Diagnose stale Action → Canvas source bindings and route the user to explicit repair instead of silently clearing them.\n''',
    '''- Diagnose stale or duplicate Action → Canvas source bindings and route the user to explicit repair instead of silently normalizing them.\n''',
)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''It also detects preserved semantic links whose source or target Screen/Action/API endpoint no longer exists, plus Action → Canvas bindings whose stored `sourceItemId` no longer resolves to a Canvas Item. Node issues focus the affected node; broken-link issues select the preserved edge, while stale Canvas bindings jump directly to the Action's Canvas-source selector so the user can explicitly reassign or clear it.''',
    '''It also detects preserved semantic links whose source or target Screen/Action/API endpoint no longer exists, plus Action → Canvas bindings whose stored `sourceItemId` no longer resolves to a Canvas Item or is assigned to multiple Actions by imported/legacy data. Node issues focus the affected node; broken-link issues select the preserved edge, while stale or duplicate Canvas bindings jump directly to the Action's Canvas-source selector so the user can explicitly reassign or clear it.''',
)
