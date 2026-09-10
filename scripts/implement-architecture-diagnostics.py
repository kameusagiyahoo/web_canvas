from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"expected text not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# Domain diagnostics: keep this pure/testable and derived from the existing semantic graph.
replace_once(
    "lib/architecture-flow.ts",
    "\n\nexport type ArchitectureGraphLayoutNode = {",
    r'''

export type ArchitectureDiagnosticKind =
  | "isolated-action"
  | "no-incoming-action"
  | "no-outgoing-action"
  | "cycle";

export type ArchitectureDiagnostic = {
  id: string;
  kind: ArchitectureDiagnosticKind;
  severity: "error" | "warning";
  endpoint: ArchitectureEndpoint;
};

/**
 * Derive Action-level architecture problems without mutating or normalizing the model.
 * Missing/unknown endpoints are ignored here because they cannot be focused as graph nodes;
 * this pass intentionally covers the four actionable Action diagnostics surfaced by the UI.
 */
export function diagnoseArchitectureFlow(
  frames: readonly Frame[],
  flow: ArchitectureFlow,
): ArchitectureDiagnostic[] {
  const options = architectureEndpointOptions(frames, flow);
  const keys = options.map((option) => architectureEndpointKey(option.endpoint));
  const known = new Set(keys);
  const incoming = new Map(keys.map((key) => [key, 0]));
  const outgoing = new Map(keys.map((key) => [key, [] as string[]]));

  for (const edge of flow.edges) {
    const from = architectureEndpointKey(edge.from);
    const to = architectureEndpointKey(edge.to);
    if (!known.has(from) || !known.has(to)) continue;
    outgoing.get(from)?.push(to);
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
  }

  // Tarjan SCC: cycle participants are components with >1 node, or a self-loop.
  let nextIndex = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycleKeys = new Set<string>();

  const visit = (key: string) => {
    const index = nextIndex++;
    indices.set(key, index);
    lowLinks.set(key, index);
    stack.push(key);
    onStack.add(key);

    for (const target of outgoing.get(key) ?? []) {
      if (!indices.has(target)) {
        visit(target);
        lowLinks.set(key, Math.min(lowLinks.get(key) ?? index, lowLinks.get(target) ?? index));
      } else if (onStack.has(target)) {
        lowLinks.set(key, Math.min(lowLinks.get(key) ?? index, indices.get(target) ?? index));
      }
    }

    if (lowLinks.get(key) !== indices.get(key)) return;
    const component: string[] = [];
    while (stack.length) {
      const member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
      if (member === key) break;
    }
    if (component.length > 1) component.forEach((member) => cycleKeys.add(member));
    else if ((outgoing.get(key) ?? []).includes(key)) cycleKeys.add(key);
  };

  keys.forEach((key) => {
    if (!indices.has(key)) visit(key);
  });

  const diagnostics: ArchitectureDiagnostic[] = [];
  for (const action of flow.nodes) {
    const endpoint: ArchitectureEndpoint = { kind: "action", id: action.id };
    const key = architectureEndpointKey(endpoint);
    const incomingCount = incoming.get(key) ?? 0;
    const outgoingCount = outgoing.get(key)?.length ?? 0;

    if (incomingCount === 0 && outgoingCount === 0) {
      diagnostics.push({
        id: `isolated-action-${action.id}`,
        kind: "isolated-action",
        severity: "error",
        endpoint,
      });
    } else {
      if (incomingCount === 0) {
        diagnostics.push({
          id: `no-incoming-action-${action.id}`,
          kind: "no-incoming-action",
          severity: "warning",
          endpoint,
        });
      }
      if (outgoingCount === 0) {
        diagnostics.push({
          id: `no-outgoing-action-${action.id}`,
          kind: "no-outgoing-action",
          severity: "warning",
          endpoint,
        });
      }
    }

    if (cycleKeys.has(key)) {
      diagnostics.push({
        id: `cycle-${action.id}`,
        kind: "cycle",
        severity: "warning",
        endpoint,
      });
    }
  }

  return diagnostics;
}

export type ArchitectureGraphLayoutNode = {''',
)

# Unit coverage for isolated, one-sided and cyclic Actions.
replace_once(
    "lib/architecture-flow.test.ts",
    "  deleteArchitectureEdge,\n  renameArchitectureAction,\n  layoutArchitectureGraph,",
    "  deleteArchitectureEdge,\n  diagnoseArchitectureFlow,\n  renameArchitectureAction,\n  layoutArchitectureGraph,",
)
replace_once(
    "lib/architecture-flow.test.ts",
    '\n\n\ndescribe("architecture graph layout", () => {',
    r'''


describe("architecture flow diagnostics", () => {
  it("reports a disconnected Action once as an isolated error", () => {
    const flow = addArchitectureAction(empty(), { id: "lonely", kind: "action", name: "Lonely" });
    expect(diagnoseArchitectureFlow(frames, flow)).toEqual([
      {
        id: "isolated-action-lonely",
        kind: "isolated-action",
        severity: "error",
        endpoint: { kind: "action", id: "lonely" },
      },
    ]);
  });

  it("distinguishes Actions with no entry from Actions with no exit", () => {
    const nodes: ArchitectureFlow = {
      version: 1,
      nodes: [
        { id: "source", kind: "action", name: "Source" },
        { id: "sink", kind: "action", name: "Sink" },
      ],
      edges: [
        { id: "source-home", from: { kind: "action", id: "source" }, to: { kind: "frame", id: "home" } },
        { id: "home-sink", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "sink" } },
      ],
    };
    expect(diagnoseArchitectureFlow(frames, nodes).map((item) => [item.kind, item.endpoint.id])).toEqual([
      ["no-incoming-action", "source"],
      ["no-outgoing-action", "sink"],
    ]);
  });

  it("marks every Action that participates in a directed cycle", () => {
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [
        { id: "a", kind: "action", name: "A" },
        { id: "b", kind: "action", name: "B" },
      ],
      edges: [
        { id: "ab", from: { kind: "action", id: "a" }, to: { kind: "action", id: "b" } },
        { id: "ba", from: { kind: "action", id: "b" }, to: { kind: "action", id: "a" } },
      ],
    };
    expect(diagnoseArchitectureFlow([], flow).map((item) => [item.kind, item.endpoint.id])).toEqual([
      ["cycle", "a"],
      ["cycle", "b"],
    ]);
  });
});


describe("architecture graph layout", () => {''',
)

# UI wiring: derive diagnostics, highlight affected nodes, and make each problem focusable.
replace_once(
    "components/ArchitectureFlow.tsx",
    "  architectureEndpointKey,\n  architectureEndpointOptions,\n  layoutArchitectureGraph,",
    "  architectureEndpointKey,\n  architectureEndpointOptions,\n  diagnoseArchitectureFlow,\n  layoutArchitectureGraph,",
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '    deleteLink: lang === "ja" ? "接続を削除" : "Delete link",\n    screens:',
    '    deleteLink: lang === "ja" ? "接続を削除" : "Delete link",\n    diagnostics: lang === "ja" ? "診断" : "Diagnostics",\n    diagnosticsHint: lang === "ja" ? "Actionの接続漏れや循環を検出します。項目を押すと該当ノードへ移動します。" : "Detect missing Action links and cycles. Select an issue to focus its node.",\n    diagnosticsOk: lang === "ja" ? "Actionの接続に問題は見つかりませんでした" : "No Action flow problems found",\n    screens:',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);',
    '  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);\n  const [highlightedEndpointKey, setHighlightedEndpointKey] = useState<string | null>(null);',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;\n',
    r'''  const selectedEdge = flow.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const diagnostics = useMemo(() => diagnoseArchitectureFlow(frames, flow), [frames, flow]);
  const diagnosticsByKey = useMemo(() => {
    const map = new Map<string, typeof diagnostics>();
    diagnostics.forEach((diagnostic) => {
      const key = architectureEndpointKey(diagnostic.endpoint);
      map.set(key, [...(map.get(key) ?? []), diagnostic]);
    });
    return map;
  }, [diagnostics]);
''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '  const clickGraphNode = (endpoint: ArchitectureEndpoint) => {\n    if (!connectMode) return;',
    '  const clickGraphNode = (endpoint: ArchitectureEndpoint) => {\n    setHighlightedEndpointKey(null);\n    if (!connectMode) return;',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '  const graphPath = (edge: ArchitectureFlow["edges"][number]) => {',
    r'''  const diagnosticMessage = (kind: string, name: string) => {
    if (lang === "ja") {
      if (kind === "isolated-action") return `どこにも接続されていないAction: ${name}`;
      if (kind === "no-incoming-action") return `入口がないAction: ${name}`;
      if (kind === "no-outgoing-action") return `出口がないAction: ${name}`;
      return `循環しているAction: ${name}`;
    }
    if (kind === "isolated-action") return `Action is not connected: ${name}`;
    if (kind === "no-incoming-action") return `Action has no incoming flow: ${name}`;
    if (kind === "no-outgoing-action") return `Action has no outgoing flow: ${name}`;
    return `Action participates in a cycle: ${name}`;
  };

  const focusDiagnostic = (endpoint: ArchitectureEndpoint) => {
    const key = architectureEndpointKey(endpoint);
    setHighlightedEndpointKey(key);
    setConnectMode(false);
    setGraphSource(null);
    setSelectedEdgeId(null);
    requestAnimationFrame(() => {
      const element = document.querySelector(`[data-testid="${endpointTestId(endpoint)}"]`) as HTMLElement | null;
      element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      element?.focus({ preventScroll: true });
    });
  };

  const graphPath = (edge: ArchitectureFlow["edges"][number]) => {''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '                  const source = graphSource && architectureEndpointKey(graphSource) === node.key;\n                  const action = node.endpoint.kind === "action";\n                  return (',
    r'''                  const source = graphSource && architectureEndpointKey(graphSource) === node.key;
                  const action = node.endpoint.kind === "action";
                  const nodeDiagnostics = diagnosticsByKey.get(node.key) ?? [];
                  const highlighted = highlightedEndpointKey === node.key;
                  const diagnosticColor = nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.error : p.primary;
                  const diagnosticBorder = highlighted || nodeDiagnostics.length > 0;
                  return (''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '                        border: `${source ? 3 : 1}px solid ${source ? p.primary : p.outlineVariant}`,',
    '                        border: `${source || highlighted ? 3 : nodeDiagnostics.length ? 2 : 1}px solid ${source ? p.primary : diagnosticBorder ? diagnosticColor : p.outlineVariant}`,',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '                        boxShadow: source ? `0 0 0 4px ${p.primaryContainer}` : "0 4px 12px rgba(0,0,0,0.08)",',
    '                        boxShadow: source ? `0 0 0 4px ${p.primaryContainer}` : highlighted ? `0 0 0 4px ${nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.errorContainer : p.primaryContainer}` : "0 4px 12px rgba(0,0,0,0.08)",',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '                        {action ? copy.actionBadge : copy.screenBadge}\n                      </span>',
    r'''                        {action ? copy.actionBadge : copy.screenBadge}
                        {nodeDiagnostics.length > 0 && (
                          <span aria-label={`${copy.diagnostics}: ${nodeDiagnostics.length}`} style={{ marginLeft: "auto", minWidth: 19, height: 19, padding: "0 5px", borderRadius: 10, display: "grid", placeItems: "center", background: nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.errorContainer : p.primaryContainer, color: nodeDiagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.onErrorContainer : p.onPrimaryContainer, fontSize: 10, fontWeight: 900 }}>
                            {nodeDiagnostics.length}
                          </span>
                        )}
                      </span>''',
)
replace_once(
    "components/ArchitectureFlow.tsx",
    '          </section>\n\n          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>',
    r'''          </section>

          <section data-testid="architecture-diagnostics" style={{ border: `1px solid ${p.outlineVariant}`, borderRadius: 20, padding: 14, background: p.surfaceContainerLow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={diagnostics.length ? "warning" : "check_circle"} size={21} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 900 }}>{copy.diagnostics}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: p.onSurfaceVariant }}>{copy.diagnosticsHint}</div>
              </div>
              <span data-testid="architecture-diagnostic-count" style={{ marginLeft: "auto", minWidth: 28, height: 28, borderRadius: 14, display: "grid", placeItems: "center", background: diagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.errorContainer : p.surfaceContainer, color: diagnostics.some((diagnostic) => diagnostic.severity === "error") ? p.onErrorContainer : p.onSurfaceVariant, fontWeight: 900, fontSize: 12 }}>
                {diagnostics.length}
              </span>
            </div>
            {diagnostics.length ? (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {diagnostics.map((diagnostic) => {
                  const key = architectureEndpointKey(diagnostic.endpoint);
                  const name = labels.get(key) ?? diagnostic.endpoint.id;
                  const message = diagnosticMessage(diagnostic.kind, name);
                  return (
                    <button
                      key={diagnostic.id}
                      type="button"
                      data-testid={`architecture-diagnostic-${diagnostic.id}`}
                      aria-label={message}
                      onClick={() => focusDiagnostic(diagnostic.endpoint)}
                      className="m3-press"
                      style={{ minHeight: 44, borderRadius: 14, border: `1px solid ${diagnostic.severity === "error" ? p.error : p.outlineVariant}`, background: diagnostic.severity === "error" ? p.errorContainer : p.surface, color: diagnostic.severity === "error" ? p.onErrorContainer : p.onSurface, padding: "8px 11px", display: "flex", alignItems: "center", gap: 9, textAlign: "left", cursor: "pointer" }}
                    >
                      <Icon name={diagnostic.kind === "cycle" ? "sync" : "warning"} size={18} />
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{message}</span>
                      <Icon name="my_location" size={17} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 12, color: p.onSurfaceVariant }}>{copy.diagnosticsOk}</div>
            )}
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>''',
)

# E2E: diagnostic jump must focus the Action node and must not mutate the document.
replace_once(
    "e2e/core.e2e.ts",
    '\n\ntest("local project library creates and switches independent projects", async ({ page }) => {',
    r'''


test("architecture diagnostics focus an affected Action without mutating the document", async ({ page }) => {
  await openSeeded(page);
  await page.getByTitle("App architecture").click();
  const architecture = page.getByTestId("architecture-flow");
  await architecture.getByTestId("architecture-action-name").fill("Validate login");
  await architecture.getByTestId("architecture-add-action").click();

  const actionNode = architecture.locator('[data-testid^="architecture-graph-node-action-"]').filter({ hasText: "Validate login" });
  await expect(actionNode).toHaveCount(1);
  await expect(architecture.getByTestId("architecture-diagnostic-count")).toHaveText("1");
  const before = await page.evaluate(() => localStorage.getItem("m3e:doc"));

  await architecture.getByRole("button", { name: "Action is not connected: Validate login" }).click();
  await expect(actionNode).toBeFocused();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("m3e:doc"))).toBe(before);
});


test("local project library creates and switches independent projects", async ({ page }) => {''',
)

# Documentation/TODO sync.
replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    "The editor now renders the combined Screen + Action model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action nodes remain the only persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology.\n",
    "The editor now renders the combined Screen + Action model as a deterministic flow diagram. Screen nodes remain derived from `Frame`; Action nodes remain the only persisted semantic nodes. The graph supports direct node-to-node connection mode and edge selection/deletion, while the detailed forms remain available for labeled links and Action management. Graph coordinates are still UI-only and are recalculated from the current topology.\n\nThe same derived graph now exposes Action diagnostics for disconnected Actions, missing incoming flow, missing outgoing flow, and directed cycles. Diagnostics do not mutate project data: selecting an issue only scrolls/focuses the affected Action node and visually highlights it.\n",
)
replace_once(
    "docs/ARCHITECTURE_FLOW.md",
    "Use the visual Action flow in real projects first. The next model extension remains an `api` node, followed by diagnostics for missing semantic endpoints before any execution semantics are introduced. Do not make Architecture Flow a second source of truth for Screen navigation.\n",
    "Use the visual Action flow and Action diagnostics in real projects first. The next diagnostics extension should cover missing semantic endpoints (for example, a deleted Screen still referenced by an architecture link). The next model extension remains an `api` node, and execution semantics should still wait for a concrete use case. Do not make Architecture Flow a second source of truth for Screen navigation.\n",
)
replace_once(
    "docs/TODO.md",
    "- [x] Render Architecture Flow as a deterministic Screen + Action graph with direct visual connection and edge selection/deletion, without persisting graph coordinates.\n- [ ] Extend Architecture Flow with an `api` node only after Action nodes are useful in real projects; keep execution semantics out of the first model.",
    "- [x] Render Architecture Flow as a deterministic Screen + Action graph with direct visual connection and edge selection/deletion, without persisting graph coordinates.\n- [x] Add actionable Architecture Flow diagnostics for isolated Actions, missing incoming/outgoing flow, and directed cycles; diagnostic jumps must not mutate the document.\n- [ ] Add Architecture Flow diagnostics for semantic links whose Screen/Action endpoint no longer exists.\n- [ ] Extend Architecture Flow with an `api` node only after Action nodes are useful in real projects; keep execution semantics out of the first model.",
)

print("architecture diagnostics patch applied")
