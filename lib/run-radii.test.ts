import { describe, expect, it } from "vitest";
import { interpolatedRunRadii } from "./run-radii";

describe("interpolated run radii", () => {
  it("keeps outer corners on the ends of a horizontal run", () => {
    expect(interpolatedRunRadii("x", true, false, false, false, 1, 20, 4)).toEqual({
      tl: 20,
      bl: 20,
      tr: 4,
      br: 4,
    });
  });

  it("softens the edge beside an opening placeholder", () => {
    expect(interpolatedRunRadii("y", false, false, true, false, 0.5, 20, 4)).toEqual({
      tl: 12,
      tr: 12,
      bl: 4,
      br: 4,
    });
  });
});
