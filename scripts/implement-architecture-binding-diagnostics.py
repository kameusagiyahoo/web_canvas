from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, found {count}")
    file.write_text(text.replace(old, new, 1))


# Pure binding-integrity diagnostic.
replace_once(
    "lib/architecture-flow.ts",
    '''export type ArchitectureDiagnosticKind =\n  | "isolated-action"\n  | "isolated-api"\n  | "no-incoming-action"\n  | "no-outgoing-action"\n  | "duplicate-api-endpoint"\n  | "cycle"\n  | "missing-source-endpoint"\n  | "missing-target-endpoint";''',
    '''export type ArchitectureDiagnosticKind =\n  | "isolated-action"\n  | "isolated-api"\n  | "no-incoming-action"\n  | "no-outgoing-action"\n  | "duplicate-api-endpoint"\n  | "cycle"\n  | "missing-source-endpoint"\n  | "missing-target-endpoint"\n  | "missing-canvas-source";''',
)

replace_once(
    "lib/architecture-flow.ts",
    '''export type ArchitectureDiagnostic = {\n  id: string;\n  kind: ArchitectureDiagnosticKind;\n  severity: "error" | "warning";\n  /** Existing endpoint to focus when possible; may itself be missing when both ends are broken. */\n  endpoint: ArchitectureEndpoint;\n  /** Broken link diagnostics select the preserved semantic edge so it can be inspected/deleted. */\n  edgeId?: string;\n  missingEndpoint?: ArchitectureEndpoint;\n};\n\n/**\n * Derive architecture problems without mutating or normalizing the model.''',
    '''export type ArchitectureDiagnostic = {\n  id: string;\n  kind: ArchitectureDiagnosticKind;\n  severity: "error" | "warning";\n  /** Existing endpoint to focus when possible; may itself be missing when both ends are broken. */\n  endpoint: ArchitectureEndpoint;\n  /** Broken link diagnostics select the preserved semantic edge so it can be inspected/deleted. */\n  edgeId?: string;\n  missingEndpoint?: ArchitectureEndpoint;\n  /** Stale Canvas-source bindings preserve the missing Item id for explicit repair. */\n  missingSourceItemId?: string;\n};\n\n/**\n * Diagnose Action → Canvas Item references separately from semantic graph connectivity.\n * Missing bindings are never normalized away here: diagnostics are view-only and let\n * the user explicitly reassign or clear the preserved sourceItemId.\n */\nexport function diagnoseArchitectureCanvasBindings(\n  flow: ArchitectureFlow,\n  knownCanvasItemIds: ReadonlySet<string>,\n): ArchitectureDiagnostic[] {\n  const diagnostics: ArchitectureDiagnostic[] = [];\n  for (const node of flow.nodes) {\n    if (node.kind !== "action" || !node.sourceItemId || knownCanvasItemIds.has(node.sourceItemId)) continue;\n    diagnostics.push({\n      id: `missing-canvas-source-${node.id}`,\n      kind: "missing-canvas-source",\n      severity: "error",\n      endpoint: { kind: "action", id: node.id },\n      missingSourceItemId: node.sourceItemId,\n    });\n  }\n  return diagnostics;\n}\n\n/**\n * Derive architecture problems without mutating or normalizing the model.''',
)

# UI: include binding diagnostics, explain them, and make them actionable.
replace_once(
    "components/ArchitectureFlow.tsx",
    '''  architectureEndpointKey,\n  architectureEndpointOptions,\n  diagnoseArchitectureFlow,''',
    '''  architectureEndpointKey,\n  architectureEndpointOptions,\n  diagnoseArchitectureCanvasBindings,\n  diagnoseArchitectureFlow,''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''    diagnosticsHint: lang === "ja" ? "Action/APIの接続漏れ・API重複・循環・削除済みノードを参照する壊れた接続を検出します。" : "Detect Action/API connectivity problems, duplicate API endpoints, cycles, and links that reference deleted endpoints.",''',
    '''    diagnosticsHint: lang === "ja" ? "Action/APIの接続漏れ・API重複・循環・削除済みノードへの接続・見つからないCanvas部品へのAction割当を検出します。" : "Detect Action/API connectivity problems, duplicate API endpoints, cycles, links to deleted endpoints, and Action bindings to missing Canvas parts.",''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''  const canvasItemsById = useMemo(() => new Map(canvasItems.map((item) => [item.id, item])), [canvasItems]);\n  const diagnostics = useMemo(() => diagnoseArchitectureFlow(frames, flow), [frames, flow]);''',
    '''  const canvasItemsById = useMemo(() => new Map(canvasItems.map((item) => [item.id, item])), [canvasItems]);\n  const canvasItemIds = useMemo(() => new Set(canvasItems.map((item) => item.id)), [canvasItems]);\n  const diagnostics = useMemo(\n    () => [...diagnoseArchitectureFlow(frames, flow), ...diagnoseArchitectureCanvasBindings(flow, canvasItemIds)],\n    [canvasItemIds, frames, flow],\n  );''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''      if (kind === "missing-source-endpoint") return `接続元が見つからないリンク: ${missingName ?? name}`;\n      if (kind === "missing-target-endpoint") return `接続先が見つからないリンク: ${missingName ?? name}`;\n      return `循環しているノード: ${name}`;''',
    '''      if (kind === "missing-source-endpoint") return `接続元が見つからないリンク: ${missingName ?? name}`;\n      if (kind === "missing-target-endpoint") return `接続先が見つからないリンク: ${missingName ?? name}`;\n      if (kind === "missing-canvas-source") return `Canvas部品が見つからないAction: ${name}${missingName ? ` (${missingName})` : ""}`;\n      return `循環しているノード: ${name}`;''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''    if (kind === "missing-source-endpoint") return `Link source is missing: ${missingName ?? name}`;\n    if (kind === "missing-target-endpoint") return `Link target is missing: ${missingName ?? name}`;\n    return `Node participates in a cycle: ${name}`;''',
    '''    if (kind === "missing-source-endpoint") return `Link source is missing: ${missingName ?? name}`;\n    if (kind === "missing-target-endpoint") return `Link target is missing: ${missingName ?? name}`;\n    if (kind === "missing-canvas-source") return `Canvas source is missing for Action: ${name}${missingName ? ` (${missingName})` : ""}`;\n    return `Node participates in a cycle: ${name}`;''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''    setConnectMode(false);\n    setGraphSource(null);\n    setSelectedEdgeId(diagnostic.edgeId ?? null);\n    requestAnimationFrame(() => {\n      if (hasFocusableNode) {''',
    '''    setConnectMode(false);\n    setGraphSource(null);\n    setSelectedEdgeId(diagnostic.edgeId ?? null);\n    if (diagnostic.kind === "missing-canvas-source") {\n      requestAnimationFrame(() => {\n        const element = document.querySelector(`[data-testid="architecture-action-source-${endpoint.id}"]`) as HTMLElement | null;\n        element?.scrollIntoView({ behavior: "smooth", block: "center" });\n        element?.focus({ preventScroll: true });\n      });\n      return;\n    }\n    requestAnimationFrame(() => {\n      if (hasFocusableNode) {''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''                  const missingName = diagnostic.missingEndpoint\n                    ? labels.get(architectureEndpointKey(diagnostic.missingEndpoint)) ?? architectureEndpointKey(diagnostic.missingEndpoint)\n                    : undefined;\n                  const message = diagnosticMessage(diagnostic.kind, name, missingName);''',
    '''                  const missingName = diagnostic.missingSourceItemId ?? (diagnostic.missingEndpoint\n                    ? labels.get(architectureEndpointKey(diagnostic.missingEndpoint)) ?? architectureEndpointKey(diagnostic.missingEndpoint)\n                    : undefined);\n                  const message = diagnosticMessage(diagnostic.kind, name, missingName);''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''                      <Icon name={diagnostic.kind === "cycle" ? "sync" : diagnostic.edgeId ? "link_off" : "warning"} size={18} />''',
    '''                      <Icon name={diagnostic.kind === "cycle" ? "sync" : diagnostic.edgeId || diagnostic.kind === "missing-canvas-source" ? "link_off" : "warning"} size={18} />''',
)

# Unit coverage.
replace_once(
    "lib/architecture-flow.test.ts",
    '''  deleteArchitectureEdge,\n  diagnoseArchitectureFlow,\n  duplicateArchitectureNode,''',
    '''  deleteArchitectureEdge,\n  diagnoseArchitectureCanvasBindings,\n  diagnoseArchitectureFlow,\n  duplicateArchitectureNode,''',
)

replace_once(
    "lib/architecture-flow.test.ts",
    '''  it("marks every Action that participates in a directed cycle", () => {''',
    '''  it("reports Action Canvas bindings whose Item no longer exists without changing the flow", () => {\n    const flow: ArchitectureFlow = {\n      version: 1,\n      nodes: [{ id: "validate", kind: "action", name: "Validate", sourceItemId: "login-button" }],\n      edges: [],\n    };\n    const before = JSON.stringify(flow);\n    expect(diagnoseArchitectureCanvasBindings(flow, new Set(["other-button"]))).toEqual([\n      {\n        id: "missing-canvas-source-validate",\n        kind: "missing-canvas-source",\n        severity: "error",\n        endpoint: { kind: "action", id: "validate" },\n        missingSourceItemId: "login-button",\n      },\n    ]);\n    expect(diagnoseArchitectureCanvasBindings(flow, new Set(["login-button"]))).toEqual([]);\n    expect(JSON.stringify(flow)).toBe(before);\n  });\n\n  it("marks every Action that participates in a directed cycle", () => {''',
)

# Browser-level regression coverage for stale imported/deleted bindings and diagnostic handoff.
replace_once(
    "e2e/core.e2e.ts",
    '''test("local project library creates and switches independent projects", async ({ page }) => {''',
    '''test("architecture diagnostics expose a missing Canvas source without mutating the document", async ({ page }) => {\n  const brokenDoc = {\n    ...seedDoc,\n    architecture: {\n      version: 1,\n      nodes: [\n        { id: "validate", kind: "action", name: "Validate login", sourceItemId: "deleted-button" },\n      ],\n      edges: [\n        { id: "home-validate", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" } },\n        { id: "validate-details", from: { kind: "action", id: "validate" }, to: { kind: "frame", id: "details" } },\n      ],\n    },\n  };\n  await page.addInitScript(({ doc }) => {\n    localStorage.setItem("m3e:doc", JSON.stringify(doc));\n    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));\n  }, { doc: brokenDoc });\n  await page.goto("/");\n  await expect(page.getByTitle("Undo")).toBeVisible();\n  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));\n\n  await page.getByTitle("App architecture").click();\n  const architecture = page.getByTestId("architecture-flow");\n  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("1");\n  await architecture.getByRole("button", { name: "Canvas source is missing for Action: Validate login (deleted-button)" }).click();\n  await expect(architecture.getByTestId("architecture-action-source-validate")).toBeFocused();\n  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);\n});\n\n\ntest("local project library creates and switches independent projects", async ({ page }) => {''',
)

# Documentation.
replace_once(
    "docs/TODO.md",
    '''- [x] Add E2E coverage for Architecture Action ↔ Canvas-part binding, source location, focused return, persistence, and Undo.\n''',
    '''- [x] Add E2E coverage for Architecture Action ↔ Canvas-part binding, source location, focused return, persistence, and Undo.\n- [x] Diagnose Architecture Action bindings that point to missing Canvas parts and jump directly to the repair control without mutating project data.\n''',
)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''The same derived graph exposes Action diagnostics for disconnected Actions, missing incoming/outgoing flow, and directed cycles. API nodes are also diagnosed when they are completely disconnected, when duplicate API nodes describe the same HTTP method + path, or when they participate in a directed cycle. It also detects preserved semantic links whose source or target Screen/Action/API endpoint no longer exists. Node issues focus the affected node; broken-link issues select the preserved edge in the editor so the user can inspect or explicitly delete it. Merely selecting diagnostics never mutates project data.''',
    '''The same derived graph exposes Action diagnostics for disconnected Actions, missing incoming/outgoing flow, and directed cycles. API nodes are also diagnosed when they are completely disconnected, when duplicate API nodes describe the same HTTP method + path, or when they participate in a directed cycle. It also detects preserved semantic links whose source or target Screen/Action/API endpoint no longer exists, plus Action → Canvas bindings whose stored `sourceItemId` no longer resolves to a Canvas Item. Node issues focus the affected node; broken-link issues select the preserved edge, while stale Canvas bindings jump directly to the Action's Canvas-source selector so the user can explicitly reassign or clear it. Merely selecting diagnostics never mutates project data or silently cleans up broken references.''',
)

replace_once(
    "docs/ROADMAP.md",
    '''- Keep Action/link changes inside normal project autosave, JSON import/export and Undo/Redo.\n- Render Screen + Action nodes as a deterministic visual graph with direct graph connection and edge selection/deletion.''',
    '''- Keep Action/link changes inside normal project autosave, JSON import/export and Undo/Redo.\n- Diagnose stale Action → Canvas source bindings and route the user to explicit repair instead of silently clearing them.\n- Render Screen + Action nodes as a deterministic visual graph with direct graph connection and edge selection/deletion.''',
)
