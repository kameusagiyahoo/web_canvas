import type {
  ArchitectureActionNode,
  ArchitectureApiNode,
  ArchitectureEdge,
  ArchitectureEndpoint,
  ArchitectureFlow,
  Frame,
} from "./tokens";

export const architectureEndpointKey = (endpoint: ArchitectureEndpoint) =>
  `${endpoint.kind}:${endpoint.id}`;

export function architectureEndpointExists(
  endpoint: ArchitectureEndpoint,
  frames: readonly Frame[],
  flow: ArchitectureFlow,
): boolean {
  if (endpoint.kind === "frame") return frames.some((frame) => frame.id === endpoint.id);
  return flow.nodes.some((node) => node.kind === endpoint.kind && node.id === endpoint.id);
}

export function addArchitectureAction(
  flow: ArchitectureFlow,
  action: ArchitectureActionNode,
): ArchitectureFlow {
  const name = action.name.trim();
  if (!name || flow.nodes.some((node) => node.id === action.id)) return flow;
  return {
    ...flow,
    nodes: [...flow.nodes, { ...action, name }],
  };
}

export function addArchitectureApi(
  flow: ArchitectureFlow,
  api: ArchitectureApiNode,
): ArchitectureFlow {
  const name = api.name.trim();
  const path = api.path.trim();
  if (!name || !path || flow.nodes.some((node) => node.kind === "api" && node.id === api.id)) return flow;
  return { ...flow, nodes: [...flow.nodes, { ...api, name, path }] };
}

export function updateArchitectureApi(
  flow: ArchitectureFlow,
  id: string,
  patch: Partial<Pick<ArchitectureApiNode, "name" | "method" | "path" | "note">>,
): ArchitectureFlow {
  const index = flow.nodes.findIndex((node) => node.kind === "api" && node.id === id);
  if (index < 0) return flow;
  const current = flow.nodes[index] as ArchitectureApiNode;
  const next = {
    ...current,
    ...patch,
    name: patch.name === undefined ? current.name : patch.name.trim(),
    path: patch.path === undefined ? current.path : patch.path.trim(),
  };
  if (!next.name || !next.path) return flow;
  if (JSON.stringify(current) === JSON.stringify(next)) return flow;
  const nodes = [...flow.nodes];
  nodes[index] = next;
  return { ...flow, nodes };
}

export function deleteArchitectureApi(flow: ArchitectureFlow, id: string): ArchitectureFlow {
  if (!flow.nodes.some((node) => node.kind === "api" && node.id === id)) return flow;
  return {
    ...flow,
    nodes: flow.nodes.filter((node) => !(node.kind === "api" && node.id === id)),
    edges: flow.edges.filter(
      (edge) =>
        !(edge.from.kind === "api" && edge.from.id === id) &&
        !(edge.to.kind === "api" && edge.to.id === id),
    ),
  };
}

export function renameArchitectureAction(
  flow: ArchitectureFlow,
  id: string,
  name: string,
): ArchitectureFlow {
  const nextName = name.trim();
  if (!nextName) return flow;
  const index = flow.nodes.findIndex((node) => node.id === id);
  if (index < 0 || flow.nodes[index].name === nextName) return flow;
  const nodes = [...flow.nodes];
  nodes[index] = { ...nodes[index], name: nextName };
  return { ...flow, nodes };
}

export function deleteArchitectureAction(
  flow: ArchitectureFlow,
  id: string,
): ArchitectureFlow {
  if (!flow.nodes.some((node) => node.id === id)) return flow;
  return {
    ...flow,
    nodes: flow.nodes.filter((node) => node.id !== id),
    edges: flow.edges.filter(
      (edge) =>
        !(edge.from.kind === "action" && edge.from.id === id) &&
        !(edge.to.kind === "action" && edge.to.id === id),
    ),
  };
}

export function connectArchitectureNodes(
  flow: ArchitectureFlow,
  edge: ArchitectureEdge,
  frames: readonly Frame[],
): ArchitectureFlow {
  if (architectureEndpointKey(edge.from) === architectureEndpointKey(edge.to)) return flow;
  if (!architectureEndpointExists(edge.from, frames, flow)) return flow;
  if (!architectureEndpointExists(edge.to, frames, flow)) return flow;
  if (
    flow.edges.some(
      (current) =>
        architectureEndpointKey(current.from) === architectureEndpointKey(edge.from) &&
        architectureEndpointKey(current.to) === architectureEndpointKey(edge.to),
    )
  ) {
    return flow;
  }
  const label = edge.label?.trim();
  return {
    ...flow,
    edges: [...flow.edges, { ...edge, label: label || undefined }],
  };
}

export function deleteArchitectureEdge(
  flow: ArchitectureFlow,
  id: string,
): ArchitectureFlow {
  if (!flow.edges.some((edge) => edge.id === id)) return flow;
  return { ...flow, edges: flow.edges.filter((edge) => edge.id !== id) };
}

export type ArchitectureEndpointOption = {
  endpoint: ArchitectureEndpoint;
  label: string;
};

export function architectureEndpointOptions(
  frames: readonly Frame[],
  flow: ArchitectureFlow,
): ArchitectureEndpointOption[] {
  return [
    ...frames.map((frame) => ({
      endpoint: { kind: "frame" as const, id: frame.id },
      label: frame.name || "Screen",
    })),
    ...flow.nodes.map((node) => ({
      endpoint: { kind: node.kind, id: node.id },
      label: node.kind === "api" ? `${node.method} ${node.path} · ${node.name}` : node.name,
    })),
  ];
}


export type ArchitectureDiagnosticKind =
  | "isolated-action"
  | "no-incoming-action"
  | "no-outgoing-action"
  | "cycle"
  | "missing-source-endpoint"
  | "missing-target-endpoint";

export type ArchitectureDiagnostic = {
  id: string;
  kind: ArchitectureDiagnosticKind;
  severity: "error" | "warning";
  /** Existing endpoint to focus when possible; may itself be missing when both ends are broken. */
  endpoint: ArchitectureEndpoint;
  /** Broken link diagnostics select the preserved semantic edge so it can be inspected/deleted. */
  edgeId?: string;
  missingEndpoint?: ArchitectureEndpoint;
};

/**
 * Derive architecture problems without mutating or normalizing the model.
 * Broken semantic links are preserved as explicit diagnostics instead of being silently deleted,
 * while Action-level connectivity and cycle checks only use edges whose endpoints still exist.
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

  for (const edge of flow.edges) {
    const fromExists = architectureEndpointExists(edge.from, frames, flow);
    const toExists = architectureEndpointExists(edge.to, frames, flow);
    if (!fromExists) {
      diagnostics.push({
        id: `missing-source-endpoint-${edge.id}`,
        kind: "missing-source-endpoint",
        severity: "error",
        endpoint: toExists ? edge.to : edge.from,
        edgeId: edge.id,
        missingEndpoint: edge.from,
      });
    }
    if (!toExists) {
      diagnostics.push({
        id: `missing-target-endpoint-${edge.id}`,
        kind: "missing-target-endpoint",
        severity: "error",
        endpoint: fromExists ? edge.from : edge.to,
        edgeId: edge.id,
        missingEndpoint: edge.to,
      });
    }
  }

  for (const action of flow.nodes.filter((node): node is ArchitectureActionNode => node.kind === "action")) {
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

export type ArchitectureGraphLayoutNode = {
  key: string;
  endpoint: ArchitectureEndpoint;
  label: string;
  kind: ArchitectureEndpoint["kind"];
  column: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ArchitectureGraphLayout = {
  nodes: ArchitectureGraphLayoutNode[];
  width: number;
  height: number;
};

const ARCH_GRAPH_NODE_W = 196;
const ARCH_GRAPH_NODE_H = 78;
const ARCH_GRAPH_GAP_X = 96;
const ARCH_GRAPH_GAP_Y = 36;
const ARCH_GRAPH_PAD = 30;

/**
 * Deterministic, UI-only layered layout for the semantic architecture graph.
 * No coordinates are written to the project. DAG sections advance left-to-right;
 * any cyclic remainder is placed in a final column instead of inventing persisted state.
 */
export function layoutArchitectureGraph(
  frames: readonly Frame[],
  flow: ArchitectureFlow,
): ArchitectureGraphLayout {
  const options = architectureEndpointOptions(frames, flow);
  const keys = options.map((option) => architectureEndpointKey(option.endpoint));
  const known = new Set(keys);
  const incoming = new Map(keys.map((key) => [key, 0]));
  const outgoing = new Map(keys.map((key) => [key, [] as string[]]));

  for (const edge of flow.edges) {
    const from = architectureEndpointKey(edge.from);
    const to = architectureEndpointKey(edge.to);
    if (!known.has(from) || !known.has(to) || from === to) continue;
    outgoing.get(from)?.push(to);
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
  }

  const remainingIncoming = new Map(incoming);
  const columns = new Map<string, number>();
  const processed = new Set<string>();
  let frontier = keys.filter((key) => (remainingIncoming.get(key) ?? 0) === 0);
  let column = 0;

  while (frontier.length) {
    const next = new Set<string>();
    for (const key of frontier) {
      if (processed.has(key)) continue;
      processed.add(key);
      columns.set(key, column);
      for (const target of outgoing.get(key) ?? []) {
        const count = Math.max(0, (remainingIncoming.get(target) ?? 0) - 1);
        remainingIncoming.set(target, count);
        if (count === 0) next.add(target);
      }
    }
    frontier = keys.filter((key) => next.has(key) && !processed.has(key));
    column += 1;
  }

  const cycleColumn = Math.max(0, column);
  for (const key of keys) {
    if (!processed.has(key)) columns.set(key, cycleColumn);
  }

  const rows = new Map<number, number>();
  const nodes = options.map((option) => {
    const key = architectureEndpointKey(option.endpoint);
    const nodeColumn = columns.get(key) ?? 0;
    const row = rows.get(nodeColumn) ?? 0;
    rows.set(nodeColumn, row + 1);
    return {
      key,
      endpoint: option.endpoint,
      label: option.label,
      kind: option.endpoint.kind,
      column: nodeColumn,
      x: ARCH_GRAPH_PAD + nodeColumn * (ARCH_GRAPH_NODE_W + ARCH_GRAPH_GAP_X),
      y: ARCH_GRAPH_PAD + row * (ARCH_GRAPH_NODE_H + ARCH_GRAPH_GAP_Y),
      w: ARCH_GRAPH_NODE_W,
      h: ARCH_GRAPH_NODE_H,
    };
  });

  const maxColumn = nodes.reduce((max, node) => Math.max(max, node.column), 0);
  const maxRows = Math.max(1, ...rows.values());
  return {
    nodes,
    width: Math.max(320, ARCH_GRAPH_PAD * 2 + (maxColumn + 1) * ARCH_GRAPH_NODE_W + maxColumn * ARCH_GRAPH_GAP_X),
    height: Math.max(260, ARCH_GRAPH_PAD * 2 + maxRows * ARCH_GRAPH_NODE_H + Math.max(0, maxRows - 1) * ARCH_GRAPH_GAP_Y),
  };
}
