import { BEZEL, Frame, frameSizeOf } from "./tokens";

export const resolvePreviewStartId = (
  frames: Frame[],
  explicitId?: string | null,
  selectedFrameId?: string | null,
  activeFrameId?: string | null,
) => {
  const candidates = [explicitId, selectedFrameId, activeFrameId, frames[0]?.id];
  return candidates.find((id): id is string => !!id && frames.some((frame) => frame.id === id)) ?? null;
};

export type PreviewCamera = { x: number; y: number; z: number };

export function previewCameraForFrame({
  frame,
  frames,
  canvasLeft,
  canvasTop,
  viewportWidth,
  viewportHeight,
  wide,
  minZoom,
  maxZoom,
}: {
  frame: Frame;
  frames: Frame[];
  canvasLeft: number;
  canvasTop: number;
  viewportWidth: number;
  viewportHeight: number;
  wide: boolean;
  minZoom: number;
  maxZoom: number;
}): PreviewCamera {
  const { w, h } = frameSizeOf(frame);
  const maxW = Math.max(...frames.map((item) => frameSizeOf(item).w)) + BEZEL * 2;
  const maxH = Math.max(...frames.map((item) => frameSizeOf(item).h)) + BEZEL * 2;
  const rawZoom = Math.min(
    1.4,
    (viewportHeight - 32) / maxH,
    (viewportWidth - (wide ? 236 : 16)) / maxW,
  );
  const z = Math.min(maxZoom, Math.max(minZoom, rawZoom));
  const cx = (viewportWidth - (wide ? 220 : 0)) / 2 - canvasLeft;
  const cy = viewportHeight / 2 - (wide ? 0 : 28) - canvasTop;
  return {
    x: cx - (frame.x + w / 2) * z,
    y: cy - (frame.y + h / 2) * z,
    z,
  };
}
