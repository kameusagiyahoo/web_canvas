import { describe, expect, it } from "vitest";
import {
  centerFrameViewAtZoom,
  clientToWorld,
  fitCanvasView,
  focusFrameView,
  panViewFromOrigin,
  pinchViewFromOrigin,
  wheelPanView,
  zoomViewAt,
  visibleWorldRect,
} from "./canvas-viewport";
import { frameSizeOf, type Frame, type Group, type Item } from "./tokens";

const button: Item = {
  id: "button",
  kind: "button",
  label: "Button",
  icon: null,
  variant: "filled",
  size: 100,
};

const group: Group = {
  id: "g1",
  x: 100,
  y: 200,
  axis: "x",
  items: [button],
};

describe("canvas coordinate transforms", () => {
  it("converts client coordinates into world coordinates", () => {
    expect(
      clientToWorld(160, 110, { left: 100, top: 50 }, { x: 20, y: 30, z: 2 }),
    ).toEqual({ x: 20, y: 15 });
  });

  it("zooms around the requested client-space anchor", () => {
    const next = zoomViewAt(
      { x: 10, y: 20, z: 1 },
      2,
      { left: 100, top: 50, width: 400, height: 300 },
      0.25,
      3,
      300,
      200,
    );
    expect(next).toEqual({ x: -180, y: -110, z: 2 });
  });

  it("clamps zoom while keeping the canvas centre fixed", () => {
    const next = zoomViewAt(
      { x: 0, y: 0, z: 1 },
      10,
      { left: 0, top: 0, width: 200, height: 100 },
      0.25,
      3,
    );
    expect(next).toEqual({ x: -200, y: -100, z: 3 });
  });
});

describe("canvas pan and pinch", () => {
  it("pans from the captured gesture origin", () => {
    expect(panViewFromOrigin({ x: 10, y: 20 }, 100, 200, 130, 180, 1.5)).toEqual({
      x: 40,
      y: 0,
      z: 1.5,
    });
  });

  it("applies wheel deltas without changing zoom", () => {
    expect(wheelPanView({ x: 10, y: 20, z: 2 }, 4, -6)).toEqual({
      x: 6,
      y: 26,
      z: 2,
    });
  });

  it("zooms and pans a two-finger gesture from its captured origin", () => {
    expect(
      pinchViewFromOrigin(
        { d0: 100, z0: 1, mx: 200, my: 200, vx: 10, vy: 20 },
        { x: 100, y: 200 },
        { x: 300, y: 200 },
        50,
        40,
        0.25,
        3,
      ),
    ).toEqual({ x: -130, y: -120, z: 2 });
  });
});

describe("canvas fitting", () => {
  it("uses the established blank-canvas fallback when nothing is placed", () => {
    expect(
      fitCanvasView({
        groups: [],
        frames: [],
        widths: {},
        frameMode: "blank",
        viewportWidth: 1000,
        viewportHeight: 700,
        mobile: false,
        minZoom: 0.25,
        maxZoom: 3,
      }),
    ).toEqual({ x: 48, y: 48, z: 1 });
  });

  it("returns a finite bounded view for placed blank-canvas content", () => {
    const next = fitCanvasView({
      groups: [group],
      frames: [],
      widths: {},
      frameMode: "blank",
      viewportWidth: 800,
      viewportHeight: 600,
      mobile: false,
      minZoom: 0.25,
      maxZoom: 3,
    });
    expect(Number.isFinite(next.x)).toBe(true);
    expect(Number.isFinite(next.y)).toBe(true);
    expect(next.z).toBeGreaterThanOrEqual(0.25);
    expect(next.z).toBeLessThanOrEqual(3);
  });

  it("centers a frame in the viewport without changing the requested zoom", () => {
    const frame: Frame = { id: "new", name: "New", x: 600, y: 80 };
    const size = frameSizeOf(frame);
    const next = centerFrameViewAtZoom(frame, 1000, 700, 1.25);

    expect(next.z).toBe(1.25);
    expect((frame.x + size.w / 2) * next.z + next.x).toBeCloseTo(500);
    expect((frame.y + size.h / 2) * next.z + next.y).toBeCloseTo(350);
  });

  it("focuses one frame with a readable mobile-width camera", () => {
    const frame: Frame = { id: "home", name: "Home", x: 0, y: 0 };
    const next = focusFrameView(frame, 440, 0.25, 3);
    expect(next.z).toBeCloseTo(412 / 432);
    expect(next.x).toBeCloseTo((440 - 412 * next.z) / 2);
    expect(next.y).toBeCloseTo(96 + 54 * next.z);
  });
});


describe("visibleWorldRect", () => {
  it("converts the current camera into world bounds", () => {
    expect(visibleWorldRect({ x: -100, y: -50, z: 2 }, 800, 600)).toEqual({
      l: 50,
      t: 25,
      w: 400,
      h: 300,
    });
  });
});
