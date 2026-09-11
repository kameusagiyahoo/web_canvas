import { describe, expect, it } from "vitest";
import type { ArchitectureFlow, Frame } from "./tokens";
import {
  addArchitectureAction,
  addArchitectureApi,
  architectureEndpointOptions,
  connectArchitectureNodes,
  deleteArchitectureAction,
  deleteArchitectureApi,
  deleteArchitectureEdge,
  diagnoseArchitectureFlow,
  renameArchitectureAction,
  updateArchitectureApi,
  layoutArchitectureGraph,
} from "./architecture-flow";

const empty = (): ArchitectureFlow => ({ version: 1, nodes: [], edges: [] });
const frames: Frame[] = [{ id: "home", name: "Home", x: 0, y: 0 }];

describe("architecture flow commands", () => {
  it("adds and renames semantic Action nodes", () => {
    const added = addArchitectureAction(empty(), { id: "load", kind: "action", name: " Load profile " });
    expect(added.nodes).toEqual([{ id: "load", kind: "action", name: "Load profile" }]);
    const renamed = renameArchitectureAction(added, "load", "Fetch profile");
    expect(renamed.nodes[0].name).toBe("Fetch profile");
  });

  it("adds, updates and deletes design-only API nodes", () => {
    const added = addArchitectureApi(empty(), { id: "login", kind: "api", name: " Login API ", method: "POST", path: " /api/login " });
    expect(added.nodes).toEqual([{ id: "login", kind: "api", name: "Login API", method: "POST", path: "/api/login" }]);
    expect(architectureEndpointOptions(frames, added).map((item) => [item.endpoint.kind, item.label])).toContainEqual(["api", "POST /api/login · Login API"]);
    const updated = updateArchitectureApi(added, "login", { method: "PATCH", path: "/api/session" });
    expect(updated.nodes[0]).toMatchObject({ kind: "api", method: "PATCH", path: "/api/session" });
    const linked = connectArchitectureNodes(updated, { id: "to-api", from: { kind: "frame", id: "home" }, to: { kind: "api", id: "login" } }, frames);
    expect(linked.edges).toHaveLength(1);
    const deleted = deleteArchitectureApi(linked, "login");
    expect(deleted.nodes).toEqual([]);
    expect(deleted.edges).toEqual([]);
  });

  it("connects known screen/action endpoints and rejects duplicate or self links", () => {
    const flow = addArchitectureAction(empty(), { id: "load", kind: "action", name: "Load profile" });
    const edge = {
      id: "edge-1",
      from: { kind: "frame" as const, id: "home" },
      to: { kind: "action" as const, id: "load" },
      label: " tap ",
    };
    const connected = connectArchitectureNodes(flow, edge, frames);
    expect(connected.edges).toHaveLength(1);
    expect(connected.edges[0].label).toBe("tap");
    expect(connectArchitectureNodes(connected, { ...edge, id: "edge-2" }, frames)).toBe(connected);
    expect(
      connectArchitectureNodes(
        connected,
        { id: "self", from: { kind: "frame", id: "home" }, to: { kind: "frame", id: "home" } },
        frames,
      ),
    ).toBe(connected);
  });

  it("deleting an Action removes its incident architecture links", () => {
    const withAction = addArchitectureAction(empty(), { id: "load", kind: "action", name: "Load" });
    const connected = connectArchitectureNodes(
      withAction,
      { id: "edge", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "load" } },
      frames,
    );
    const deleted = deleteArchitectureAction(connected, "load");
    expect(deleted.nodes).toEqual([]);
    expect(deleted.edges).toEqual([]);
  });

  it("lists screen and Action endpoints and deletes individual links", () => {
    const withAction = addArchitectureAction(empty(), { id: "save", kind: "action", name: "Save" });
    expect(architectureEndpointOptions(frames, withAction).map((item) => item.label)).toEqual(["Home", "Save"]);
    const connected = connectArchitectureNodes(
      withAction,
      { id: "edge", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "save" } },
      frames,
    );
    expect(deleteArchitectureEdge(connected, "edge").edges).toEqual([]);
  });
});



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

  it("reports semantic links whose source or target endpoint no longer exists", () => {
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [{ id: "load", kind: "action", name: "Load" }],
      edges: [
        { id: "missing-target", from: { kind: "action", id: "load" }, to: { kind: "frame", id: "deleted-screen" } },
        { id: "missing-source", from: { kind: "frame", id: "deleted-source" }, to: { kind: "action", id: "load" } },
      ],
    };
    const broken = diagnoseArchitectureFlow(frames, flow).filter((item) => item.kind.startsWith("missing-"));
    expect(broken).toEqual([
      {
        id: "missing-target-endpoint-missing-target",
        kind: "missing-target-endpoint",
        severity: "error",
        endpoint: { kind: "action", id: "load" },
        edgeId: "missing-target",
        missingEndpoint: { kind: "frame", id: "deleted-screen" },
      },
      {
        id: "missing-source-endpoint-missing-source",
        kind: "missing-source-endpoint",
        severity: "error",
        endpoint: { kind: "action", id: "load" },
        edgeId: "missing-source",
        missingEndpoint: { kind: "frame", id: "deleted-source" },
      },
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


describe("architecture graph layout", () => {
  it("places a Screen → Action → Screen chain in successive columns", () => {
    const chainFrames: Frame[] = [
      { id: "home", name: "Home", x: 0, y: 0 },
      { id: "done", name: "Done", x: 500, y: 0 },
    ];
    const flow: ArchitectureFlow = {
      version: 1,
      nodes: [{ id: "validate", kind: "action", name: "Validate" }],
      edges: [
        { id: "a", from: { kind: "frame", id: "home" }, to: { kind: "action", id: "validate" } },
        { id: "b", from: { kind: "action", id: "validate" }, to: { kind: "frame", id: "done" } },
      ],
    };
    const layout = layoutArchitectureGraph(chainFrames, flow);
    const byKey = new Map(layout.nodes.map((node) => [node.key, node]));
    expect(byKey.get("frame:home")?.column).toBe(0);
    expect(byKey.get("action:validate")?.column).toBe(1);
    expect(byKey.get("frame:done")?.column).toBe(2);
    expect(layout.width).toBeGreaterThan(600);
  });

  it("keeps cycles finite and deterministic without persisted coordinates", () => {
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
    const first = layoutArchitectureGraph([], flow);
    const second = layoutArchitectureGraph([], flow);
    expect(first).toEqual(second);
    expect(first.nodes).toHaveLength(2);
    expect(first.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
  });
});
