import { describe, expect, it } from "vitest";
import { itemRectsOfGroups } from "./canvas-selection";
import { buildNavigationLinks, patchNavigationLink } from "./navigation-links";
import { BACK_TARGET, makeItem, type Frame, type Group } from "./tokens";

const source: Frame = { id: "source", name: "Source", x: 0, y: 0 };
const target: Frame = { id: "target", name: "Target", x: 600, y: 0 };

function linkedGroup(): Group {
  return {
    id: "g",
    x: 16,
    y: 120,
    axis: "x",
    items: [
      {
        ...makeItem("button"),
        id: "button",
        action: { to: "target", transition: "slide" },
      },
    ],
  };
}

describe("navigation link geometry", () => {
  it("builds a rightward curve to the target frame", () => {
    const group = linkedGroup();
    const links = buildNavigationLinks(
      [group],
      [source, target],
      itemRectsOfGroups([group], {}),
    );
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe("button|");
    expect(links[0].ang).toBe(0);
    expect(links[0].tx).toBeLessThan(target.x);
    expect(links[0].d.startsWith("M")).toBe(true);
  });

  it("does not draw back-stack actions", () => {
    const group = linkedGroup();
    group.items[0].action = { to: BACK_TARGET, transition: "slide" };
    expect(
      buildNavigationLinks(
        [group],
        [source, target],
        itemRectsOfGroups([group], {}),
      ),
    ).toEqual([]);
  });
});

describe("navigation link mutation", () => {
  it("patches a top-level transition", () => {
    const next = patchNavigationLink([linkedGroup()], "button|", (action) => ({
      ...action,
      transition: "fade",
    }));
    expect(next[0].items[0].action?.transition).toBe("fade");
  });

  it("removes one slot action without deleting the other slots", () => {
    const group = linkedGroup();
    group.items[0] = {
      ...group.items[0],
      actions: {
        "tab:0": { to: "target", transition: "slide" },
        "tab:1": { to: "source", transition: "fade" },
      },
    };
    const next = patchNavigationLink([group], "button|tab:0", () => undefined);
    expect(next[0].items[0].actions?.["tab:0"]).toBeUndefined();
    expect(next[0].items[0].actions?.["tab:1"]?.to).toBe("source");
  });
});
