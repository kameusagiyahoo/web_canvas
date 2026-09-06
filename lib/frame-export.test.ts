import { describe, expect, it, vi } from "vitest";
import type { Frame } from "./tokens";
import { encodeFrameElementPng, frameExportFileName, framePngOptions } from "./frame-export";

const frame: Frame = { id: "f", name: "Home", x: 0, y: 0 };

describe("frame export", () => {
  it("uses a stable fallback file name", () => {
    expect(frameExportFileName(frame)).toBe("Home.png");
    expect(frameExportFileName({ ...frame, name: "   " })).toBe("screen.png");
  });

  it("exports at 2x using the frame dimensions", () => {
    expect(framePngOptions(frame)).toEqual({
      pixelRatio: 2,
      cacheBust: true,
      width: 412,
      height: 892,
    });
  });

  it("passes frame dimensions to an injected encoder", async () => {
    const encoder = vi.fn(async () => "data:image/png;base64,test");
    const element = {} as HTMLElement;
    await expect(encodeFrameElementPng(element, frame, encoder)).resolves.toBe(
      "data:image/png;base64,test",
    );
    expect(encoder).toHaveBeenCalledWith(element, framePngOptions(frame));
  });
});
