import type {
  ArchitectureActionNode,
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
  return flow.nodes.some((node) => node.id === endpoint.id);
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
      endpoint: { kind: "action" as const, id: node.id },
      label: node.name,
    })),
  ];
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
