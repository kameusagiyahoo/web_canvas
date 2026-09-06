import { describe, expect, it } from "vitest";
import { deriveNavigationGraph, layoutNavigationGraph } from "./navigation-graph";
import type { Doc } from "./tokens";

const doc = (overrides: Partial<Doc> = {}): Doc => ({
  title: "Flow",
  paletteKey: "purple",
  frame: "phone",
  brief: "",
  frames: [
    { id: "home", name: "Home", x: 0, y: 0 },
    { id: "details", name: "Details", x: 532, y: 0 },
    { id: "done", name: "Done", x: 1064, y: 0 },
  ],
  groups: [
    {
      id: "home-group",
      x: 24,
      y: 120,
      axis: "x",
      items: [
        {
          id: "open-details",
          kind: "button",
          label: "Details",
          icon: null,
          variant: "filled",
          action: { to: "details", transition: "slide" },
        },
        {
          id: "tabs",
          kind: "tabs",
          label: "",
          icon: null,
          variant: "filled",
          tabs: [{ icon: "", label: "Done" }],
          actions: { "tab:0": { to: "done", transition: "fade" } },
        },
      ],
    },
    {
      id: "details-group",
      x: 556,
      y: 120,
      axis: "x",
      items: [
        {
          id: "back",
          kind: "button",
          label: "Back",
          icon: null,
          variant: "filled",
          action: { to: "back", transition: "slideLeft" },
        },
      ],
    },
  ],
  ...overrides,
});

describe("deriveNavigationGraph", () => {
  it("derives item, slot and swipe edges without persisting a second model", () => {
    const graph = deriveNavigationGraph(
      doc({
        frames: [
          { id: "home", name: "Home", x: 0, y: 0, swipe: { left: "details" } },
          { id: "details", name: "Details", x: 532, y: 0 },
          { id: "done", name: "Done", x: 1064, y: 0 },
        ],
      }),
      {},
    );

    expect(graph.startFrameId).toBe("home");
    expect(graph.edges.map((edge) => edge.source).sort()).toEqual(["item", "slot", "swipe"]);
    expect(graph.edges.find((edge) => edge.source === "slot")?.slot).toBe("tab:0");
    expect(graph.nodes.find((node) => node.frameId === "details")?.backActions).toBe(1);
  });

  it("flags missing targets and excludes them from reachability counts", () => {
    const broken = doc({
      groups: [
        {
          id: "home-group",
          x: 24,
          y: 120,
          axis: "x",
          items: [
            {
              id: "broken",
              kind: "button",
              label: "Broken",
              icon: null,
              variant: "filled",
              action: { to: "missing", transition: "none" },
            },
          ],
        },
      ],
    });
    const graph = deriveNavigationGraph(broken, {});

    expect(graph.edges[0]?.validTarget).toBe(false);
    expect(graph.problems).toContainEqual({
      kind: "missing-target",
      edgeId: graph.edges[0].id,
      fromFrameId: "home",
      targetId: "missing",
    });
    expect(graph.reachableFrameIds).toEqual(["home"]);
  });

  it("reports unreachable, no-incoming and parallel routes", () => {
    const graph = deriveNavigationGraph(
      doc({
        groups: [
          {
            id: "home-group",
            x: 24,
            y: 120,
            axis: "x",
            items: [
              {
                id: "a",
                kind: "button",
                label: "A",
                icon: null,
                variant: "filled",
                action: { to: "details", transition: "slide" },
              },
              {
                id: "b",
                kind: "button",
                label: "B",
                icon: null,
                variant: "filled",
                action: { to: "details", transition: "fade" },
              },
            ],
          },
        ],
      }),
      {},
    );

    expect(graph.problems.some((problem) => problem.kind === "parallel")).toBe(true);
    expect(graph.problems).toContainEqual({ kind: "unreachable", frameId: "done" });
    expect(graph.problems).toContainEqual({ kind: "no-incoming", frameId: "done" });
  });

  it("uses a valid preferred start screen", () => {
    const graph = deriveNavigationGraph(doc(), {}, "details");
    expect(graph.startFrameId).toBe("details");
  });
});

describe("layoutNavigationGraph", () => {
  it("lays reachable screens left-to-right and disconnected screens last", () => {
    const graph = deriveNavigationGraph(doc(), {});
    const layout = layoutNavigationGraph(graph);
    const byId = new Map(layout.nodes.map((node) => [node.frameId, node]));

    expect(byId.get("home")!.depth).toBe(0);
    expect(byId.get("details")!.depth).toBe(1);
    expect(byId.get("done")!.depth).toBe(1);
    expect(byId.get("details")!.x).toBeGreaterThan(byId.get("home")!.x);
    expect(layout.width).toBeGreaterThan(layout.nodeWidth);
    expect(layout.height).toBeGreaterThan(layout.nodeHeight);
  });

  it("returns a finite empty layout", () => {
    const graph = deriveNavigationGraph(doc({ frames: [], groups: [] }), {});
    const layout = layoutNavigationGraph(graph);
    expect(layout.nodes).toEqual([]);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });
});
