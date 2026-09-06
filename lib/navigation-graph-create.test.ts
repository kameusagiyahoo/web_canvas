import { describe, expect, it } from "vitest";
import {
  availableNavigationRouteTriggers,
  createNavigationRoute,
} from "./navigation-graph-edit";
import { makeItem, type Frame, type Group } from "./tokens";

const frames: Frame[] = [
  { id: "home", name: "Home", x: 0, y: 0 },
  { id: "detail", name: "Detail", x: 600, y: 0 },
];

function groups(): Group[] {
  return [
    {
      id: "g",
      x: 16,
      y: 120,
      axis: "x",
      items: [{ ...makeItem("button"), id: "open", label: "Open" }],
    },
  ];
}

describe("navigation graph route creation", () => {
  it("offers unused item and swipe triggers", () => {
    const triggers = availableNavigationRouteTriggers({ frames, groups: groups() }, {}, "home");
    expect(triggers.some((trigger) => trigger.kind === "item" && trigger.itemId === "open")).toBe(true);
    expect(triggers.some((trigger) => trigger.kind === "swipe")).toBe(true);
    expect(triggers.some((trigger) => trigger.kind === "new-button")).toBe(true);
  });

  it("creates an item route without graph-owned state", () => {
    const result = createNavigationRoute(
      { frames, groups: groups() },
      {},
      "home",
      "detail",
      { kind: "item", itemId: "open", label: "Open" },
    );
    expect(result?.groups[0].items[0].action).toEqual({ to: "detail", transition: "slide" });
  });

  it("creates an item route with the selected transition", () => {
    const result = createNavigationRoute(
      { frames, groups: groups() },
      {},
      "home",
      "detail",
      { kind: "item", itemId: "open", label: "Open" },
      "fade",
    );
    expect(result?.groups[0].items[0].action).toEqual({ to: "detail", transition: "fade" });
  });

  it("creates a swipe route only when the direction is unused", () => {
    const trigger = { kind: "swipe", swipe: "left", label: "Left" } as const;
    const result = createNavigationRoute({ frames, groups: groups() }, {}, "home", "detail", trigger);
    expect(result?.frames[0].swipe?.left).toBe("detail");
    expect(
      createNavigationRoute(
        { frames: result!.frames, groups: result!.groups },
        {},
        "home",
        "detail",
        trigger,
      ),
    ).toBeNull();
  });

  it("can create a button in the source screen and attach the route", () => {
    const result = createNavigationRoute(
      { frames, groups: [] },
      {},
      "home",
      "detail",
      { kind: "new-button", label: "New button" },
    );
    expect(result?.groups).toHaveLength(1);
    expect(result?.groups[0].items[0].kind).toBe("button");
    expect(result?.groups[0].items[0].action?.to).toBe("detail");
  });
});
