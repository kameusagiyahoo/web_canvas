import { toPng } from "html-to-image";
import { frameSizeOf, type Frame } from "./tokens";

export type FramePngEncoder = (
  element: HTMLElement,
  options: { pixelRatio: number; cacheBust: boolean; width: number; height: number },
) => Promise<string>;

export function frameExportFileName(frame: Frame): string {
  return `${frame.name.trim() || "screen"}.png`;
}

export function framePngOptions(frame: Frame) {
  const { w, h } = frameSizeOf(frame);
  return { pixelRatio: 2, cacheBust: true, width: w, height: h } as const;
}

/** Waits until the offscreen export layer has committed and web fonts have settled. */
export async function waitForFrameExportLayer(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await document.fonts?.ready;
}

export async function encodeFrameElementPng(
  element: HTMLElement,
  frame: Frame,
  encoder: FramePngEncoder = toPng,
): Promise<string> {
  return encoder(element, framePngOptions(frame));
}

/** Encodes the already-rendered export layer and starts the browser download. */
export async function downloadFrameElementPng(
  element: HTMLElement,
  frame: Frame,
): Promise<void> {
  const url = await encodeFrameElementPng(element, frame);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = frameExportFileName(frame);
  anchor.click();
}
