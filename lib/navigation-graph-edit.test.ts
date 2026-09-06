import { describe, expect, it } from "vitest";
import { editNavigationEdge } from "./navigation-graph-edit";
import type { NavigationEdge } from "./navigation-graph";
import { BACK_TARGET, makeItem, type Frame, type Group } from "./tokens";

const frames: Frame[] = [
  { id: "home", name: "Home", x: 0, y: 0 },
  { id: "detail", name: "Detail", x: 600, y: 0 },
  { id: "settings", name: "Settings", x: 1200, y: 0 },
];

function groups(): Group[] {
  return [
    {
      id: "g",
      x: 16,
      y: 120,
      axis: "x",
      items: [
        {
          ...makeItem("button"),
          id: "button",
          action: { to: "detail", transition: "slide" },
          actions: {
            "slot:0": { to: "settings", transition: "fade" },
          },
        },
      ],
    },
  ];
}

const itemEdge: NavigationEdge = {
  id: "item:home:button:tap:detail",
  fromFrameId: "home",
  toFrameId: "detail",
  source: "item",
  itemId: "button",
  transition: "slide",
  validTarget: true,
};

const slotEdge: NavigationEdge = {
  id: "slot:home:button:slot:0:settings",
  fromFrameId: "home",
  toFrameId: "settings",
  source: "slot",
  itemId: "button",
  slot: "slot:0",
  transition: "fade",
  validTarget: true,
};

describe("navigation graph editing", () => {
  it("changes an item edge destination and transition through existing action fields", () => {
    const result = editNavigationEdge(
      { frames, groups: groups() },
      itemEdge,
      { to: "settings", transition: "fade" },
    );
    expect(result?.groups[0].items[0].action).toEqual({
      to: "settings",
      transition: "fade",
    });
    expect(result?.frames).toEqual(frames);
  });

  it("can turn an item edge into a back-stack action", () => {
    const result = editNavigationEdge(
      { frames, groups: groups() },
      itemEdge,
      { to: BACK_TARGET },
    );
    expect(result?.groups[0].items[0].action?.to).toBe(BACK_TARGET);
  });

  it("removes only the selected slot action", () => {
    const result = editNavigationEdge(
      { frames, groups: groups() },
      slotEdge,
      { remove: true },
    );
    expect(result?.groups[0].items[0].actions?.["slot:0"]).toBeUndefined();
    expect(result?.groups[0].items[0].action?.to).toBe("detail");
  });

  it("changes and removes swipe destinations without creating graph-owned data", () => {
    const withSwipe: Frame[] = [
      { ...frames[0], swipe: { left: "detail", right: "settings" } },
      frames[1],
      frames[2],
    ];
    const swipeEdge: NavigationEdge = {
      id: "swipe:home:left:detail",
      fromFrameId: "home",
      toFrameId: "detail",
      source: "swipe",
      swipe: "left",
      transition: "slide",
      validTarget: true,
    };
    const moved = editNavigationEdge(
      { frames: withSwipe, groups: groups() },
      swipeEdge,
      { to: "settings" },
    );
    expect(moved?.frames[0].swipe).toEqual({ left: "settings", right: "settings" });

    const removed = editNavigationEdge(
      { frames: moved!.frames, groups: moved!.groups },
      { ...swipeEdge, toFrameId: "settings" },
      { remove: true },
    );
    expect(removed?.frames[0].swipe).toEqual({ right: "settings" });
  });

  it("rejects BACK_TARGET for swipe edges", () => {
    const swipeEdge: NavigationEdge = {
      id: "swipe:home:left:detail",
      fromFrameId: "home",
      toFrameId: "detail",
      source: "swipe",
      swipe: "left",
      transition: "slide",
      validTarget: true,
    };
    expect(
      editNavigationEdge(
        { frames: [{ ...frames[0], swipe: { left: "detail" } }, frames[1], frames[2]], groups: groups() },
        swipeEdge,
        { to: BACK_TARGET },
      ),
    ).toBeNull();
  });
});
