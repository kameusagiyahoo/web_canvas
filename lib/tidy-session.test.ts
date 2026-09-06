import { describe, expect, it } from "vitest";
import { makeItem, type Frame, type Group } from "./tokens";
import { tidyStateForFrame, toggleFrameTidy, type TidySession } from "./tidy-session";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };

const group = (x = 180, y = 420): Group => ({
  id: "g",
  x,
  y,
  axis: "x",
  items: [{ ...makeItem("button"), id: "i" }],
});

describe("tidy session", () => {
  it("reports done when a frame has no groups to change", () => {
    expect(tidyStateForFrame(null, [], frame, [frame], {})).toBe("done");
  });

  it("records before/after state for a tidy pass", () => {
    const groups = [group()];
    const result = toggleFrameTidy(null, groups, frame, [frame], {});
    expect(result).not.toBeNull();
    expect(result!.session?.before).toBe(groups);
    expect(result!.session?.after).toBe(result!.groups);
    expect(result!.session?.frameId).toBe("f");
  });

  it("offers and performs the one-step tidy undo while after-state is current", () => {
    const before = [group(16, 120)];
    const after = [group(16, 160)];
    const session: TidySession = { frameId: "f", before, after };
    expect(tidyStateForFrame(session, after, frame, [frame], {})).toBe("undo");
    expect(toggleFrameTidy(session, after, frame, [frame], {})).toEqual({
      groups: before,
      session: null,
    });
  });
});
