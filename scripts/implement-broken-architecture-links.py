from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"marker not found in {path}: {old[:80]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"marker is not unique in {path}: {text.count(old)} occurrences")
    p.write_text(text.replace(old, new, 1))


# Domain diagnostics: preserve broken semantic links and report which endpoint is gone.
replace_once(
    "lib/architecture-flow.ts",
    '''export type ArchitectureDiagnosticKind =\n  | "isolated-action"\n  | "no-incoming-action"\n  | "no-outgoing-action"\n  | "cycle";\n\nexport type ArchitectureDiagnostic = {\n  id: string;\n  kind: ArchitectureDiagnosticKind;\n  severity: "error" | "warning";\n  endpoint: ArchitectureEndpoint;\n};\n\n/**\n * Derive Action-level architecture problems without mutating or normalizing the model.\n * Missing/unknown endpoints are ignored here because they cannot be focused as graph nodes;\n * this pass intentionally covers the four actionable Action diagnostics surfaced by the UI.\n */''',
    '''export type ArchitectureDiagnosticKind =\n  | "isolated-action"\n  | "no-incoming-action"\n  | "no-outgoing-action"\n  | "cycle"\n  | "missing-source-endpoint"\n  | "missing-target-endpoint";\n\nexport type ArchitectureDiagnostic = {\n  id: string;\n  kind: ArchitectureDiagnosticKind;\n  severity: "error" | "warning";\n  /** Existing endpoint to focus when possible; may itself be missing when both ends are broken. */\n  endpoint: ArchitectureEndpoint;\n  /** Broken link diagnostics select the preserved semantic edge so it can be inspected/deleted. */\n  edgeId?: string;\n  missingEndpoint?: ArchitectureEndpoint;\n};\n\n/**\n * Derive architecture problems without mutating or normalizing the model.\n * Broken semantic links are preserved as explicit diagnostics instead of being silently deleted,\n * while Action-level connectivity and cycle checks only use edges whose endpoints still exist.\n */''',
)

replace_once(
    "lib/architecture-flow.ts",
    '''  const diagnostics: ArchitectureDiagnostic[] = [];\n  for (const action of flow.nodes) {''',
    '''  const diagnostics: ArchitectureDiagnostic[] = [];\n\n  for (const edge of flow.edges) {\n    const fromExists = architectureEndpointExists(edge.from, frames, flow);\n    const toExists = architectureEndpointExists(edge.to, frames, flow);\n    if (!fromExists) {\n      diagnostics.push({\n        id: `missing-source-endpoint-${edge.id}`,\n        kind: "missing-source-endpoint",\n        severity: "error",\n        endpoint: toExists ? edge.to : edge.from,\n        edgeId: edge.id,\n        missingEndpoint: edge.from,\n      });\n    }\n    if (!toExists) {\n      diagnostics.push({\n        id: `missing-target-endpoint-${edge.id}`,\n        kind: "missing-target-endpoint",\n        severity: "error",\n        endpoint: fromExists ? edge.from : edge.to,\n        edgeId: edge.id,\n        missingEndpoint: edge.to,\n      });\n    }\n  }\n\n  for (const action of flow.nodes) {''',
)

# Unit coverage for preserved links to deleted Screen/Action endpoints.
replace_once(
    "lib/architecture-flow.test.ts",
    '''  it("marks every Action that participates in a directed cycle", () => {''',
    '''  it("reports semantic links whose source or target endpoint no longer exists", () => {\n    const flow: ArchitectureFlow = {\n      version: 1,\n      nodes: [{ id: "load", kind: "action", name: "Load" }],\n      edges: [\n        { id: "missing-target", from: { kind: "action", id: "load" }, to: { kind: "frame", id: "deleted-screen" } },\n        { id: "missing-source", from: { kind: "frame", id: "deleted-source" }, to: { kind: "action", id: "load" } },\n      ],\n    };\n    const broken = diagnoseArchitectureFlow(frames, flow).filter((item) => item.kind.startsWith("missing-"));\n    expect(broken).toEqual([\n      {\n        id: "missing-target-endpoint-missing-target",\n        kind: "missing-target-endpoint",\n        severity: "error",\n        endpoint: { kind: "action", id: "load" },\n        edgeId: "missing-target",\n        missingEndpoint: { kind: "frame", id: "deleted-screen" },\n      },\n      {\n        id: "missing-source-endpoint-missing-source",\n        kind: "missing-source-endpoint",\n        severity: "error",\n        endpoint: { kind: "action", id: "load" },\n        edgeId: "missing-source",\n        missingEndpoint: { kind: "frame", id: "deleted-source" },\n      },\n    ]);\n  });\n\n  it("marks every Action that participates in a directed cycle", () => {''',
)

# UI: broken-link diagnostics select the hidden/preserved edge and focus the valid side when available.
replace_once(
    "components/ArchitectureFlow.tsx",
    '''    diagnosticsHint: lang === "ja" ? "Actionの接続漏れや循環を検出します。項目を押すと該当ノードへ移動します。" : "Detect missing Action links and cycles. Select an issue to focus its node.",\n    diagnosticsOk: lang === "ja" ? "Actionの接続に問題は見つかりませんでした" : "No Action flow problems found",''',
    '''    diagnosticsHint: lang === "ja" ? "Actionの接続漏れ・循環・削除済みノードを参照する壊れた接続を検出します。" : "Detect Action flow problems, cycles, and links that reference deleted endpoints.",\n    diagnosticsOk: lang === "ja" ? "Architecture Flowに問題は見つかりませんでした" : "No Architecture Flow problems found",''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''  const diagnosticMessage = (kind: string, name: string) => {\n    if (lang === "ja") {\n      if (kind === "isolated-action") return `どこにも接続されていないAction: ${name}`;\n      if (kind === "no-incoming-action") return `入口がないAction: ${name}`;\n      if (kind === "no-outgoing-action") return `出口がないAction: ${name}`;\n      return `循環しているAction: ${name}`;\n    }\n    if (kind === "isolated-action") return `Action is not connected: ${name}`;\n    if (kind === "no-incoming-action") return `Action has no incoming flow: ${name}`;\n    if (kind === "no-outgoing-action") return `Action has no outgoing flow: ${name}`;\n    return `Action participates in a cycle: ${name}`;\n  };\n\n  const focusDiagnostic = (endpoint: ArchitectureEndpoint) => {\n    const key = architectureEndpointKey(endpoint);\n    setHighlightedEndpointKey(key);\n    setConnectMode(false);\n    setGraphSource(null);\n    setSelectedEdgeId(null);\n    requestAnimationFrame(() => {\n      const element = document.querySelector(`[data-testid="${endpointTestId(endpoint)}"]`) as HTMLElement | null;\n      element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });\n      element?.focus({ preventScroll: true });\n    });\n  };''',
    '''  const diagnosticMessage = (kind: string, name: string, missingName?: string) => {\n    if (lang === "ja") {\n      if (kind === "isolated-action") return `どこにも接続されていないAction: ${name}`;\n      if (kind === "no-incoming-action") return `入口がないAction: ${name}`;\n      if (kind === "no-outgoing-action") return `出口がないAction: ${name}`;\n      if (kind === "missing-source-endpoint") return `接続元が見つからないリンク: ${missingName ?? name}`;\n      if (kind === "missing-target-endpoint") return `接続先が見つからないリンク: ${missingName ?? name}`;\n      return `循環しているAction: ${name}`;\n    }\n    if (kind === "isolated-action") return `Action is not connected: ${name}`;\n    if (kind === "no-incoming-action") return `Action has no incoming flow: ${name}`;\n    if (kind === "no-outgoing-action") return `Action has no outgoing flow: ${name}`;\n    if (kind === "missing-source-endpoint") return `Link source is missing: ${missingName ?? name}`;\n    if (kind === "missing-target-endpoint") return `Link target is missing: ${missingName ?? name}`;\n    return `Action participates in a cycle: ${name}`;\n  };\n\n  const focusDiagnostic = (diagnostic: (typeof diagnostics)[number]) => {\n    const endpoint = diagnostic.endpoint;\n    const key = architectureEndpointKey(endpoint);\n    const hasFocusableNode = graphNodes.has(key);\n    setHighlightedEndpointKey(hasFocusableNode ? key : null);\n    setConnectMode(false);\n    setGraphSource(null);\n    setSelectedEdgeId(diagnostic.edgeId ?? null);\n    requestAnimationFrame(() => {\n      const element = hasFocusableNode\n        ? document.querySelector(`[data-testid="${endpointTestId(endpoint)}"]`) as HTMLElement | null\n        : document.querySelector('[data-testid="architecture-graph-edge-editor"]') as HTMLElement | null;\n      element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });\n      element?.focus({ preventScroll: true });\n    });\n  };''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''                  const key = architectureEndpointKey(diagnostic.endpoint);\n                  const name = labels.get(key) ?? diagnostic.endpoint.id;\n                  const message = diagnosticMessage(diagnostic.kind, name);''',
    '''                  const key = architectureEndpointKey(diagnostic.endpoint);\n                  const name = labels.get(key) ?? diagnostic.endpoint.id;\n                  const missingName = diagnostic.missingEndpoint\n                    ? labels.get(architectureEndpointKey(diagnostic.missingEndpoint)) ?? architectureEndpointKey(diagnostic.missingEndpoint)\n                    : undefined;\n                  const message = diagnosticMessage(diagnostic.kind, name, missingName);''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''                      onClick={() => focusDiagnostic(diagnostic.endpoint)}''',
    '''                      onClick={() => focusDiagnostic(diagnostic)}''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''                      <Icon name={diagnostic.kind === "cycle" ? "sync" : "warning"} size={18} />''',
    '''                      <Icon name={diagnostic.kind === "cycle" ? "sync" : diagnostic.edgeId ? "link_off" : "warning"} size={18} />''',
)

# E2E: a preserved link to a deleted Screen must surface and open the edge editor without changing storage.
replace_once(
    "e2e/core.e2e.ts",
    '''test("local project library creates and switches independent projects", async ({ page }) => {''',
    '''test("architecture diagnostics expose a broken semantic link without mutating the document", async ({ page }) => {\n  const brokenDoc = {\n    ...seedDoc,\n    architecture: {\n      version: 1,\n      nodes: [],\n      edges: [\n        { id: "stale-link", from: { kind: "frame", id: "home" }, to: { kind: "frame", id: "deleted-screen" } },\n      ],\n    },\n  };\n  await page.addInitScript(({ doc }) => {\n    localStorage.setItem("m3e:doc", JSON.stringify(doc));\n    localStorage.setItem("m3e:ui", JSON.stringify({ lang: "en" }));\n  }, { doc: brokenDoc });\n  await page.goto("/");\n  await expect(page.getByTitle("Undo")).toBeVisible();\n  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));\n\n  await page.getByTitle("App architecture").click();\n  const architecture = page.getByTestId("architecture-flow");\n  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("1");\n  await architecture.getByRole("button", { name: "Link target is missing: frame:deleted-screen" }).click();\n\n  const editor = architecture.getByTestId("architecture-graph-edge-editor");\n  await expect(editor).toBeVisible();\n  await expect(editor).toContainText("Home → frame:deleted-screen");\n  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);\n});\n\n\ntest("local project library creates and switches independent projects", async ({ page }) => {''',
)

# Docs/TODO milestone.
replace_once(
    "docs/TODO.md",
    '''- [ ] Add Architecture Flow diagnostics for semantic links whose Screen/Action endpoint no longer exists.''',
    '''- [x] Add Architecture Flow diagnostics for semantic links whose Screen/Action endpoint no longer exists, with direct edge inspection/deletion and no silent cleanup.''',
)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''The same derived graph now exposes Action diagnostics for disconnected Actions, missing incoming flow, missing outgoing flow, and directed cycles. Diagnostics do not mutate project data: selecting an issue only scrolls/focuses the affected Action node and visually highlights it.''',
    '''The same derived graph now exposes Action diagnostics for disconnected Actions, missing incoming flow, missing outgoing flow, and directed cycles. It also detects preserved semantic links whose source or target Screen/Action endpoint no longer exists. Action issues focus the affected node; broken-link issues select the preserved edge in the editor so the user can inspect or explicitly delete it. Merely selecting diagnostics never mutates project data.''',
)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''Deleting an Action also deletes architecture links incident to that Action. Deleting a Screen does not currently rewrite semantic links automatically; missing Screen endpoints are preserved as explicit architecture information for a later diagnostics pass rather than silently guessing intent.''',
    '''Deleting an Action also deletes architecture links incident to that Action. Deleting a Screen does not rewrite semantic links automatically; missing Screen/Action endpoints remain preserved as explicit architecture information and are surfaced as broken-link diagnostics rather than being silently guessed or removed.''',
)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''Use the visual Action flow and Action diagnostics in real projects first. The next diagnostics extension should cover missing semantic endpoints (for example, a deleted Screen still referenced by an architecture link). The next model extension remains an `api` node, and execution semantics should still wait for a concrete use case. Do not make Architecture Flow a second source of truth for Screen navigation.''',
    '''Use the visual Action flow and diagnostics in real projects first. Broken semantic endpoints are now detected without silently rewriting project data. The next model extension remains an `api` node, and execution semantics should still wait for a concrete use case. Do not make Architecture Flow a second source of truth for Screen navigation.''',
)

print("implemented broken Architecture Flow link diagnostics")
