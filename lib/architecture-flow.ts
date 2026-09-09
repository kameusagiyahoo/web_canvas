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
