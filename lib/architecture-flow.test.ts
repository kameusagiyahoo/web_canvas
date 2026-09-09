import { describe, expect, it } from "vitest";
import type { ArchitectureFlow, Frame } from "./tokens";
import {
  addArchitectureAction,
  architectureEndpointOptions,
  connectArchitectureNodes,
  deleteArchitectureAction,
  deleteArchitectureEdge,
  renameArchitectureAction,
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
