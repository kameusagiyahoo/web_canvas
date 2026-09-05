import { describe, expect, it } from "vitest";
import type { Frame } from "./tokens";
import { previewCameraForFrame, resolvePreviewStartId } from "./preview-session";

const frames: Frame[] = [
  { id: "a", name: "A", x: 0, y: 0 },
  { id: "b", name: "B", x: 500, y: 0 },
];

describe("preview session", () => {
  it("prefers explicit, selected, active, then first frame", () => {
    expect(resolvePreviewStartId(frames, "b", "a", "a")).toBe("b");
    expect(resolvePreviewStartId(frames, null, "b", "a")).toBe("b");
    expect(resolvePreviewStartId(frames, null, null, "b")).toBe("b");
    expect(resolvePreviewStartId(frames)).toBe("a");
  });

  it("ignores stale frame ids", () => {
    expect(resolvePreviewStartId(frames, "gone", null, "b")).toBe("b");
    expect(resolvePreviewStartId([], "gone")).toBeNull();
  });

  it("returns a bounded camera centered on the requested frame", () => {
    const view = previewCameraForFrame({
      frame: frames[1],
      frames,
      canvasLeft: 0,
      canvasTop: 0,
      viewportWidth: 390,
      viewportHeight: 844,
      wide: false,
      minZoom: 0.1,
      maxZoom: 2,
    });
    expect(view.z).toBeGreaterThanOrEqual(0.1);
    expect(view.z).toBeLessThanOrEqual(2);
    expect(Number.isFinite(view.x)).toBe(true);
    expect(Number.isFinite(view.y)).toBe(true);
  });
});
