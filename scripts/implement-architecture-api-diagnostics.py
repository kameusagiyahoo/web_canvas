from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"pattern not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "lib/architecture-flow.ts",
    '''export type ArchitectureDiagnosticKind =\n  | "isolated-action"\n  | "no-incoming-action"\n  | "no-outgoing-action"\n  | "cycle"\n  | "missing-source-endpoint"\n  | "missing-target-endpoint";''',
    '''export type ArchitectureDiagnosticKind =\n  | "isolated-action"\n  | "isolated-api"\n  | "no-incoming-action"\n  | "no-outgoing-action"\n  | "duplicate-api-endpoint"\n  | "cycle"\n  | "missing-source-endpoint"\n  | "missing-target-endpoint";''',
)

replace_once(
    "lib/architecture-flow.ts",
    ''' * while Action-level connectivity and cycle checks only use edges whose endpoints still exist.\n */''',
    ''' * while semantic-node connectivity and cycle checks only use edges whose endpoints still exist.\n */''',
)

replace_once(
    "lib/architecture-flow.ts",
    '''  for (const action of flow.nodes.filter((node): node is ArchitectureActionNode => node.kind === "action")) {\n    const endpoint: ArchitectureEndpoint = { kind: "action", id: action.id };\n    const key = architectureEndpointKey(endpoint);\n    const incomingCount = incoming.get(key) ?? 0;\n    const outgoingCount = outgoing.get(key)?.length ?? 0;\n\n    if (incomingCount === 0 && outgoingCount === 0) {\n      diagnostics.push({\n        id: `isolated-action-${action.id}`,\n        kind: "isolated-action",\n        severity: "error",\n        endpoint,\n      });\n    } else {\n      if (incomingCount === 0) {\n        diagnostics.push({\n          id: `no-incoming-action-${action.id}`,\n          kind: "no-incoming-action",\n          severity: "warning",\n          endpoint,\n        });\n      }\n      if (outgoingCount === 0) {\n        diagnostics.push({\n          id: `no-outgoing-action-${action.id}`,\n          kind: "no-outgoing-action",\n          severity: "warning",\n          endpoint,\n        });\n      }\n    }\n\n    if (cycleKeys.has(key)) {\n      diagnostics.push({\n        id: `cycle-${action.id}`,\n        kind: "cycle",\n        severity: "warning",\n        endpoint,\n      });\n    }\n  }\n\n  return diagnostics;''',
    '''  for (const action of flow.nodes.filter((node): node is ArchitectureActionNode => node.kind === "action")) {\n    const endpoint: ArchitectureEndpoint = { kind: "action", id: action.id };\n    const key = architectureEndpointKey(endpoint);\n    const incomingCount = incoming.get(key) ?? 0;\n    const outgoingCount = outgoing.get(key)?.length ?? 0;\n\n    if (incomingCount === 0 && outgoingCount === 0) {\n      diagnostics.push({\n        id: `isolated-action-${action.id}`,\n        kind: "isolated-action",\n        severity: "error",\n        endpoint,\n      });\n    } else {\n      if (incomingCount === 0) {\n        diagnostics.push({\n          id: `no-incoming-action-${action.id}`,\n          kind: "no-incoming-action",\n          severity: "warning",\n          endpoint,\n        });\n      }\n      if (outgoingCount === 0) {\n        diagnostics.push({\n          id: `no-outgoing-action-${action.id}`,\n          kind: "no-outgoing-action",\n          severity: "warning",\n          endpoint,\n        });\n      }\n    }\n\n    if (cycleKeys.has(key)) {\n      diagnostics.push({\n        id: `cycle-${action.id}`,\n        kind: "cycle",\n        severity: "warning",\n        endpoint,\n      });\n    }\n  }\n\n  const apiNodes = flow.nodes.filter((node): node is ArchitectureApiNode => node.kind === "api");\n  const apiSignatures = new Map<string, ArchitectureApiNode[]>();\n  for (const api of apiNodes) {\n    const endpoint: ArchitectureEndpoint = { kind: "api", id: api.id };\n    const key = architectureEndpointKey(endpoint);\n    const incomingCount = incoming.get(key) ?? 0;\n    const outgoingCount = outgoing.get(key)?.length ?? 0;\n\n    if (incomingCount === 0 && outgoingCount === 0) {\n      diagnostics.push({\n        id: `isolated-api-${api.id}`,\n        kind: "isolated-api",\n        severity: "error",\n        endpoint,\n      });\n    }\n\n    if (cycleKeys.has(key)) {\n      diagnostics.push({\n        id: `cycle-${api.id}`,\n        kind: "cycle",\n        severity: "warning",\n        endpoint,\n      });\n    }\n\n    const signature = `${api.method} ${api.path}`;\n    apiSignatures.set(signature, [...(apiSignatures.get(signature) ?? []), api]);\n  }\n\n  for (const duplicates of apiSignatures.values()) {\n    if (duplicates.length < 2) continue;\n    for (const api of duplicates) {\n      diagnostics.push({\n        id: `duplicate-api-endpoint-${api.id}`,\n        kind: "duplicate-api-endpoint",\n        severity: "warning",\n        endpoint: { kind: "api", id: api.id },\n      });\n    }\n  }\n\n  return diagnostics;''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''    diagnosticsHint: lang === "ja" ? "Actionの接続漏れ・循環・削除済みノードを参照する壊れた接続を検出します。" : "Detect Action flow problems, cycles, and links that reference deleted endpoints.",''',
    '''    diagnosticsHint: lang === "ja" ? "Action/APIの接続漏れ・API重複・循環・削除済みノードを参照する壊れた接続を検出します。" : "Detect Action/API connectivity problems, duplicate API endpoints, cycles, and links that reference deleted endpoints.",''',
)

replace_once(
    "components/ArchitectureFlow.tsx",
    '''      if (kind === "isolated-action") return `どこにも接続されていないAction: ${name}`;\n      if (kind === "no-incoming-action") return `入口がないAction: ${name}`;\n      if (kind === "no-outgoing-action") return `出口がないAction: ${name}`;\n      if (kind === "missing-source-endpoint") return `接続元が見つからないリンク: ${missingName ?? name}`;\n      if (kind === "missing-target-endpoint") return `接続先が見つからないリンク: ${missingName ?? name}`;\n      return `循環しているAction: ${name}`;\n    }\n    if (kind === "isolated-action") return `Action is not connected: ${name}`;\n    if (kind === "no-incoming-action") return `Action has no incoming flow: ${name}`;\n    if (kind === "no-outgoing-action") return `Action has no outgoing flow: ${name}`;\n    if (kind === "missing-source-endpoint") return `Link source is missing: ${missingName ?? name}`;\n    if (kind === "missing-target-endpoint") return `Link target is missing: ${missingName ?? name}`;\n    return `Action participates in a cycle: ${name}`;''',
    '''      if (kind === "isolated-action") return `どこにも接続されていないAction: ${name}`;\n      if (kind === "isolated-api") return `どこにも接続されていないAPI: ${name}`;\n      if (kind === "duplicate-api-endpoint") return `同じメソッドとパスのAPIが複数あります: ${name}`;\n      if (kind === "no-incoming-action") return `入口がないAction: ${name}`;\n      if (kind === "no-outgoing-action") return `出口がないAction: ${name}`;\n      if (kind === "missing-source-endpoint") return `接続元が見つからないリンク: ${missingName ?? name}`;\n      if (kind === "missing-target-endpoint") return `接続先が見つからないリンク: ${missingName ?? name}`;\n      return `循環しているノード: ${name}`;\n    }\n    if (kind === "isolated-action") return `Action is not connected: ${name}`;\n    if (kind === "isolated-api") return `API is not connected: ${name}`;\n    if (kind === "duplicate-api-endpoint") return `Duplicate API method/path: ${name}`;\n    if (kind === "no-incoming-action") return `Action has no incoming flow: ${name}`;\n    if (kind === "no-outgoing-action") return `Action has no outgoing flow: ${name}`;\n    if (kind === "missing-source-endpoint") return `Link source is missing: ${missingName ?? name}`;\n    if (kind === "missing-target-endpoint") return `Link target is missing: ${missingName ?? name}`;\n    return `Node participates in a cycle: ${name}`;''',
)

# Add focused unit coverage before graph-layout tests.
test_path = Path("lib/architecture-flow.test.ts")
test_text = test_path.read_text()
marker = '\n\ndescribe("architecture graph layout", () => {'
insert = r'''

  it("reports isolated and duplicate API endpoints", () => {
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [
        { id: "users-a", kind: "api", name: "Users A", method: "GET", path: "/api/users" },
        { id: "users-b", kind: "api", name: "Users B", method: "GET", path: "/api/users" },
      ],
      edges: [],
    };
    expect(diagnoseArchitectureFlow([], flow).map((item) => [item.kind, item.endpoint.id])).toEqual([
      ["isolated-api", "users-a"],
      ["isolated-api", "users-b"],
      ["duplicate-api-endpoint", "users-a"],
      ["duplicate-api-endpoint", "users-b"],
    ]);
  });

  it("marks API nodes that participate in a directed cycle", () => {
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [
        { id: "action", kind: "action", name: "Action" },
        { id: "api", kind: "api", name: "API", method: "POST", path: "/api/run" },
      ],
      edges: [
        { id: "to-api", from: { kind: "action", id: "action" }, to: { kind: "api", id: "api" } },
        { id: "to-action", from: { kind: "api", id: "api" }, to: { kind: "action", id: "action" } },
      ],
    };
    expect(
      diagnoseArchitectureFlow([], flow)
        .filter((item) => item.kind === "cycle")
        .map((item) => [item.endpoint.kind, item.endpoint.id]),
    ).toEqual([
      ["action", "action"],
      ["api", "api"],
    ]);
  });
'''
if "reports isolated and duplicate API endpoints" not in test_text:
    if marker not in test_text:
        raise SystemExit("architecture graph layout marker not found")
    test_path.write_text(test_text.replace(marker, insert + marker, 1))

# Add a browser-level assertion that diagnostics are navigation-only.
e2e_path = Path("e2e/core.e2e.ts")
e2e = e2e_path.read_text()
if "architecture API diagnostics identify isolated duplicate endpoints without mutating the document" not in e2e:
    e2e += r'''


test("architecture API diagnostics identify isolated duplicate endpoints without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");

  const addApi = async (name: string) => {
    await architecture.getByTestId("architecture-api-method").selectOption("GET");
    await architecture.getByTestId("architecture-api-path").fill("/api/health");
    await architecture.getByTestId("architecture-api-name").fill(name);
    await architecture.getByTestId("architecture-add-api").click();
  };
  await addApi("Health A");
  await addApi("Health B");

  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("4");
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));
  const apiNode = architecture.locator('[data-testid^="architecture-graph-node-api-"]').filter({ hasText: "Health A" });
  await architecture.getByRole("button", { name: /API is not connected: GET \/api\/health · Health A/ }).click();
  await expect(apiNode).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});
'''
    e2e_path.write_text(e2e)

replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    '''The same derived graph now exposes Action diagnostics for disconnected Actions, missing incoming flow, missing outgoing flow, and directed cycles. It also detects preserved semantic links whose source or target Screen/Action endpoint no longer exists. Action issues focus the affected node; broken-link issues select the preserved edge in the editor so the user can inspect or explicitly delete it. Merely selecting diagnostics never mutates project data.''',
    '''The same derived graph exposes Action diagnostics for disconnected Actions, missing incoming flow, missing outgoing flow, and directed cycles. API nodes are also diagnosed when they are completely disconnected, when duplicate API nodes describe the same HTTP method + path, or when they participate in a directed cycle. It also detects preserved semantic links whose source or target Screen/Action/API endpoint no longer exists. Node issues focus the affected node; broken-link issues select the preserved edge in the editor so the user can inspect or explicitly delete it. Merely selecting diagnostics never mutates project data.''',
)

replace_once(
    "docs/TODO.md",
    '''- [x] Extend Architecture Flow with a design-only `api` node (name, HTTP method, path) while keeping execution semantics out of the model.\n- [ ] Evaluate an `agent` or `database` architecture node only after real projects demonstrate the need; do not add execution semantics by default.''',
    '''- [x] Extend Architecture Flow with a design-only `api` node (name, HTTP method, path) while keeping execution semantics out of the model.\n- [x] Extend Architecture Flow diagnostics to isolated APIs, duplicate HTTP method + path definitions, and API cycle participation without mutating project data.\n- [ ] Evaluate an `agent` or `database` architecture node only after real projects demonstrate the need; do not add execution semantics by default.''',
)
