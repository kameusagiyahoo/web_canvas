import { describe, expect, it } from "vitest";
import { fitGraphZoom, graphCenterScroll, stepGraphZoom } from "./graph-viewport";

describe("graph viewport helpers", () => {
  it("steps zoom within the supported range", () => {
    expect(stepGraphZoom(1, 1)).toBe(1.1);
    expect(stepGraphZoom(1, -1)).toBe(0.9);
    expect(stepGraphZoom(1.6, 1)).toBe(1.6);
    expect(stepGraphZoom(0.4, -1)).toBe(0.4);
  });

  it("fits a graph without enlarging small layouts", () => {
    expect(fitGraphZoom(1000, 600, 2000, 1000)).toBeCloseTo(0.48, 2);
    expect(fitGraphZoom(1000, 600, 400, 300)).toBe(1);
    expect(fitGraphZoom(300, 200, 4000, 3000)).toBe(0.4);
  });

  it("centers a node while clamping to scroll bounds", () => {
    expect(graphCenterScroll({ centerX: 800, centerY: 400, zoom: 1.5, viewportWidth: 600, viewportHeight: 400, scrollWidth: 1600, scrollHeight: 1000 })).toEqual({ left: 900, top: 400 });
    expect(graphCenterScroll({ centerX: 20, centerY: 20, zoom: 1, viewportWidth: 600, viewportHeight: 400, scrollWidth: 1600, scrollHeight: 1000 })).toEqual({ left: 0, top: 0 });
  });
});
