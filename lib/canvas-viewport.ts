import {
  BEZEL,
  FRAME_LABEL_H,
  PHONE_H,
  PHONE_W,
  clamp,
  frameRect,
  frameSizeOf,
  layoutOf,
  type Frame,
  type FrameMode,
  type Group,
} from "./tokens";

export type CanvasView = { x: number; y: number; z: number };

export type CanvasRectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PinchOrigin = {
  d0: number;
  z0: number;
  mx: number;
  my: number;
  vx: number;
  vy: number;
};

/** Converts client coordinates into the canvas' world coordinate system. */
export function clientToWorld(
  clientX: number,
  clientY: number,
  rect: Pick<CanvasRectLike, "left" | "top"> | null | undefined,
  view: CanvasView,
) {
  return {
    x: (clientX - (rect?.left ?? 0) - view.x) / view.z,
    y: (clientY - (rect?.top ?? 0) - view.y) / view.z,
  };
}

/** Zooms around one client-space point, or around the canvas centre when omitted. */
export function zoomViewAt(
  view: CanvasView,
  nextZoom: number,
  rect: CanvasRectLike | null | undefined,
  minZoom: number,
  maxZoom: number,
  clientX?: number,
  clientY?: number,
): CanvasView {
  const z = clamp(nextZoom, minZoom, maxZoom);
  const px =
    clientX === undefined
      ? (rect?.width ?? 0) / 2
      : clientX - (rect?.left ?? 0);
  const py =
    clientY === undefined
      ? (rect?.height ?? 0) / 2
      : clientY - (rect?.top ?? 0);
  return {
    x: px - ((px - view.x) * z) / view.z,
    y: py - ((py - view.y) * z) / view.z,
    z,
  };
}

export function panViewFromOrigin(
  origin: Pick<CanvasView, "x" | "y">,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
  zoom: number,
): CanvasView {
  return {
    x: origin.x + (clientX - startX),
    y: origin.y + (clientY - startY),
    z: zoom,
  };
}

export function wheelPanView(
  view: CanvasView,
  deltaX: number,
  deltaY: number,
): CanvasView {
  return { ...view, x: view.x - deltaX, y: view.y - deltaY };
}

/** Reproduces the two-finger pinch camera from the gesture's captured origin. */
export function pinchViewFromOrigin(
  origin: PinchOrigin,
  currentA: { x: number; y: number },
  currentB: { x: number; y: number },
  canvasLeft: number,
  canvasTop: number,
  minZoom: number,
  maxZoom: number,
): CanvasView {
  const distance = Math.hypot(currentA.x - currentB.x, currentA.y - currentB.y);
  const z = clamp(
    (origin.z0 * distance) / Math.max(1, origin.d0),
    minZoom,
    maxZoom,
  );
  const mx = (currentA.x + currentB.x) / 2;
  const my = (currentA.y + currentB.y) / 2;
  const px = origin.mx - canvasLeft;
  const py = origin.my - canvasTop;
  return {
    x: px - ((px - origin.vx) * z) / origin.z0 + (mx - origin.mx),
    y: py - ((py - origin.vy) * z) / origin.z0 + (my - origin.my),
    z,
  };
}

export function fitCanvasView(args: {
  groups: readonly Group[];
  frames: readonly Frame[];
  widths: Record<string, number>;
  frameMode: FrameMode;
  viewportWidth: number;
  viewportHeight: number;
  mobile: boolean;
  minZoom: number;
  maxZoom: number;
}): CanvasView {
  const {
    groups,
    frames,
    widths,
    frameMode,
    viewportWidth,
    viewportHeight,
    mobile,
    minZoom,
    maxZoom,
  } = args;

  let x0 = -BEZEL;
  let y0 = -BEZEL - FRAME_LABEL_H;
  let x1 = PHONE_W + BEZEL;
  let y1 = PHONE_H + BEZEL;

  if (frameMode === "phone" && frames.length > 0) {
    x0 = Math.min(...frames.map((frame) => frame.x)) - BEZEL;
    y0 = Math.min(...frames.map((frame) => frame.y)) - BEZEL - FRAME_LABEL_H;
    x1 = Math.max(...frames.map((frame) => frameRect(frame).r)) + BEZEL;
    y1 = Math.max(...frames.map((frame) => frameRect(frame).b)) + BEZEL;
  }

  if (frameMode === "blank") {
    if (groups.length === 0) return { x: 48, y: 48, z: 1 };
    x0 = Infinity;
    y0 = Infinity;
    x1 = -Infinity;
    y1 = -Infinity;
    for (const group of groups) {
      for (const placed of layoutOf(group, widths)) {
        x0 = Math.min(x0, placed.x);
        y0 = Math.min(y0, placed.y);
        x1 = Math.max(x1, placed.x + placed.w);
        y1 = Math.max(y1, placed.y + placed.h);
      }
    }
  }

  const pad = mobile ? 14 : 40;
  const top = mobile ? 96 : 84;
  const bottom = mobile ? 96 : pad;

  if (mobile) {
    const z = clamp(
      (viewportWidth - pad * 2) / (x1 - x0),
      minZoom,
      maxZoom,
    );
    return {
      x: (viewportWidth - (x1 - x0) * z) / 2 - x0 * z,
      y: top - y0 * z,
      z,
    };
  }

  const z = clamp(
    Math.min(
      (viewportWidth - pad * 2) / (x1 - x0),
      (viewportHeight - top - bottom) / (y1 - y0),
      1,
    ),
    minZoom,
    maxZoom,
  );
  return {
    x: (viewportWidth - (x1 - x0) * z) / 2 - x0 * z,
    y:
      top +
      (viewportHeight - top - bottom - (y1 - y0) * z) / 2 -
      y0 * z,
    z,
  };
}

/** Centers one frame in the current canvas viewport without changing zoom. */
export function centerFrameViewAtZoom(
  frame: Frame,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
): CanvasView {
  const { w, h } = frameSizeOf(frame);
  return {
    x: viewportWidth / 2 - (frame.x + w / 2) * zoom,
    y: viewportHeight / 2 - (frame.y + h / 2) * zoom,
    z: zoom,
  };
}

/** Camera used when mobile screen switching focuses one frame. */
export function focusFrameView(
  frame: Frame,
  viewportWidth: number,
  minZoom: number,
  maxZoom: number,
): CanvasView {
  const { w } = frameSizeOf(frame);
  const pad = 14;
  const top = 96;
  const z = clamp(
    (viewportWidth - pad * 2) / (w + BEZEL * 2),
    minZoom,
    maxZoom,
  );
  return {
    x: (viewportWidth - w * z) / 2 - frame.x * z,
    y: top - (frame.y - BEZEL - FRAME_LABEL_H) * z,
    z,
  };
}

/** World-space rectangle currently visible through a viewport. */
export function visibleWorldRect(
  view: CanvasView,
  viewportWidth: number,
  viewportHeight: number,
) {
  return {
    l: -view.x / view.z,
    t: -view.y / view.z,
    w: viewportWidth / view.z,
    h: viewportHeight / view.z,
  };
}
