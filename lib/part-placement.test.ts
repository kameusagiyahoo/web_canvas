import { describe, expect, it } from "vitest";
import { adaptItemToFrame } from "./part-placement";
import { Frame, frameSizeOf, makeItem, sizeOf } from "./tokens";

describe("adaptItemToFrame", () => {
  const frame: Frame = { id: "f1", name: "Home", x: 120, y: 40 };
  const widths: Record<string, number> = {};

  it("fits full-width bars to the target screen body", () => {
    const item = makeItem("topAppBar");
    const result = adaptItemToFrame(item, frame, [], [frame], widths);

    expect(result.slotX).toBe(frame.x);
    expect(sizeOf(result.item, widths).w).toBe(frameSizeOf(frame).w);
  });

  it("keeps ordinary parts out of the bar slot while applying frame height rules", () => {
    const item = makeItem("button");
    const result = adaptItemToFrame(item, frame, [], [frame], widths);

    expect(result.slotX).toBeNull();
    expect(result.item.kind).toBe("button");
    expect(sizeOf(result.item, widths).h).toBeLessThanOrEqual(frameSizeOf(frame).h);
  });
});
