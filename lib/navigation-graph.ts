import {
  BACK_TARGET,
  SWIPE_DIRS,
  actionsOf,
  frameOfGroup,
  type Doc,
  type SwipeDir,
  type Transition,
} from "./tokens";

export type NavigationEdgeSource = "item" | "slot" | "swipe";

export type NavigationNode = {
  frameId: string;
  label: string;
  index: number;
  incoming: number;
  outgoing: number;
  backActions: number;
};

export type NavigationEdge = {
  id: string;
  fromFrameId: string;
  toFrameId: string;
  source: NavigationEdgeSource;
  itemId?: string;
  itemLabel?: string;
  slot?: string;
  swipe?: SwipeDir;
  transition?: Transition;
  validTarget: boolean;
};

export type NavigationProblem =
  | {
      kind: "missing-target";
      edgeId: string;
      fromFrameId: string;
      targetId: string;
    }
  | {
      kind: "unreachable";
      frameId: string;
    }
  | {
      kind: "no-incoming";
      frameId: string;
    }
  | {
      kind: "parallel";
      fromFrameId: string;
      toFrameId: string;
      edgeIds: string[];
    };

export type NavigationGraph = {
  nodes: NavigationNode[];
  edges: NavigationEdge[];
  problems: NavigationProblem[];
  startFrameId: string | null;
  reachableFrameIds: string[];
};

export type NavigationLayoutNode = NavigationNode & {
  x: number;
  y: number;
  depth: number;
};

export type NavigationGraphLayout = {
  nodes: NavigationLayoutNode[];
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
};

const swipeTransition = (dir: SwipeDir): Transition =>
  SWIPE_DIRS.find((entry) => entry.key === dir)?.transition ?? "none";

/**
 * Convert the document's existing navigation fields into a read-only graph view.
 * The graph is deliberately derived: nodes and edges are never persisted separately.
 */
export function deriveNavigationGraph(
  doc: Pick<Doc, "frames" | "groups">,
  widths: Record<string, number>,
  preferredStartFrameId?: string | null,
): NavigationGraph {
  const frameIds = new Set(doc.frames.map((frame) => frame.id));
  const startFrameId =
    (preferredStartFrameId && frameIds.has(preferredStartFrameId) ? preferredStartFrameId : null) ??
    doc.frames[0]?.id ??
    null;

  const edges: NavigationEdge[] = [];
  const backCount = new Map<string, number>();

  for (const group of doc.groups) {
    const sourceFrame = frameOfGroup(group, doc.frames, widths);
    if (!sourceFrame) continue;
    for (const item of group.items) {
      for (const { slot, action } of actionsOf(item)) {
        if (action.to === BACK_TARGET) {
          backCount.set(sourceFrame.id, (backCount.get(sourceFrame.id) ?? 0) + 1);
          continue;
        }
        const source: NavigationEdgeSource = slot ? "slot" : "item";
        edges.push({
          id: `${source}:${sourceFrame.id}:${item.id}:${slot || "tap"}:${action.to}`,
          fromFrameId: sourceFrame.id,
          toFrameId: action.to,
          source,
          itemId: item.id,
          itemLabel: item.label,
          slot: slot || undefined,
          transition: action.transition,
          validTarget: frameIds.has(action.to),
        });
      }
    }
  }

  for (const frame of doc.frames) {
    for (const [dir, target] of Object.entries(frame.swipe ?? {}) as [SwipeDir, string][]) {
      if (!target) continue;
      edges.push({
        id: `swipe:${frame.id}:${dir}:${target}`,
        fromFrameId: frame.id,
        toFrameId: target,
        source: "swipe",
        swipe: dir,
        transition: swipeTransition(dir),
        validTarget: frameIds.has(target),
      });
    }
  }

  const validEdges = edges.filter((edge) => edge.validTarget);
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const edge of validEdges) {
    outgoing.set(edge.fromFrameId, (outgoing.get(edge.fromFrameId) ?? 0) + 1);
    incoming.set(edge.toFrameId, (incoming.get(edge.toFrameId) ?? 0) + 1);
  }

  const reachable = new Set<string>();
  if (startFrameId) {
    const queue = [startFrameId];
    reachable.add(startFrameId);
    while (queue.length) {
      const current = queue.shift()!;
      for (const edge of validEdges) {
        if (edge.fromFrameId !== current || reachable.has(edge.toFrameId)) continue;
        reachable.add(edge.toFrameId);
        queue.push(edge.toFrameId);
      }
    }
  }

  const problems: NavigationProblem[] = [];
  for (const edge of edges) {
    if (!edge.validTarget) {
      problems.push({
        kind: "missing-target",
        edgeId: edge.id,
        fromFrameId: edge.fromFrameId,
        targetId: edge.toFrameId,
      });
    }
  }
  for (const frame of doc.frames) {
    if (startFrameId && frame.id !== startFrameId && !reachable.has(frame.id)) {
      problems.push({ kind: "unreachable", frameId: frame.id });
    }
    if (frame.id !== startFrameId && (incoming.get(frame.id) ?? 0) === 0) {
      problems.push({ kind: "no-incoming", frameId: frame.id });
    }
  }

  const parallel = new Map<string, string[]>();
  for (const edge of validEdges) {
    const key = `${edge.fromFrameId}\u0000${edge.toFrameId}`;
    const ids = parallel.get(key) ?? [];
    ids.push(edge.id);
    parallel.set(key, ids);
  }
  for (const [key, edgeIds] of parallel) {
    if (edgeIds.length < 2) continue;
    const [fromFrameId, toFrameId] = key.split("\u0000");
    problems.push({ kind: "parallel", fromFrameId, toFrameId, edgeIds });
  }

  const nodes: NavigationNode[] = doc.frames.map((frame, index) => ({
    frameId: frame.id,
    label: frame.name || `Screen ${index + 1}`,
    index,
    incoming: incoming.get(frame.id) ?? 0,
    outgoing: outgoing.get(frame.id) ?? 0,
    backActions: backCount.get(frame.id) ?? 0,
  }));

  return {
    nodes,
    edges,
    problems,
    startFrameId,
    reachableFrameIds: [...reachable],
  };
}

/**
 * Deterministic left-to-right layout. Reachable screens use their shortest-path
 * depth from the start screen; disconnected screens occupy one final column.
 */
export function layoutNavigationGraph(
  graph: NavigationGraph,
  options: {
    nodeWidth?: number;
    nodeHeight?: number;
    columnGap?: number;
    rowGap?: number;
    margin?: number;
  } = {},
): NavigationGraphLayout {
  const nodeWidth = options.nodeWidth ?? 184;
  const nodeHeight = options.nodeHeight ?? 104;
  const columnGap = options.columnGap ?? 120;
  const rowGap = options.rowGap ?? 36;
  const margin = options.margin ?? 32;

  if (!graph.nodes.length) {
    return { nodes: [], width: margin * 2, height: margin * 2, nodeWidth, nodeHeight };
  }

  const validEdges = graph.edges.filter((edge) => edge.validTarget);
  const depth = new Map<string, number>();
  if (graph.startFrameId) {
    depth.set(graph.startFrameId, 0);
    const queue = [graph.startFrameId];
    while (queue.length) {
      const current = queue.shift()!;
      const currentDepth = depth.get(current) ?? 0;
      for (const edge of validEdges) {
        if (edge.fromFrameId !== current) continue;
        const nextDepth = currentDepth + 1;
        const previous = depth.get(edge.toFrameId);
        if (previous !== undefined && previous <= nextDepth) continue;
        depth.set(edge.toFrameId, nextDepth);
        queue.push(edge.toFrameId);
      }
    }
  }

  const reachableDepths = [...depth.values()];
  const disconnectedDepth = (reachableDepths.length ? Math.max(...reachableDepths) : -1) + 1;
  const columns = new Map<number, NavigationNode[]>();
  for (const node of graph.nodes) {
    const d = depth.get(node.frameId) ?? disconnectedDepth;
    const column = columns.get(d) ?? [];
    column.push(node);
    columns.set(d, column);
  }
  for (const column of columns.values()) column.sort((a, b) => a.index - b.index);

  const laidOut: NavigationLayoutNode[] = [];
  let maxColumn = 0;
  let maxRows = 1;
  for (const [d, column] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    maxColumn = Math.max(maxColumn, d);
    maxRows = Math.max(maxRows, column.length);
    column.forEach((node, row) => {
      laidOut.push({
        ...node,
        depth: d,
        x: margin + d * (nodeWidth + columnGap),
        y: margin + row * (nodeHeight + rowGap),
      });
    });
  }

  return {
    nodes: laidOut.sort((a, b) => a.index - b.index),
    width: margin * 2 + nodeWidth + maxColumn * (nodeWidth + columnGap),
    height: margin * 2 + nodeHeight + (maxRows - 1) * (nodeHeight + rowGap),
    nodeWidth,
    nodeHeight,
  };
}
