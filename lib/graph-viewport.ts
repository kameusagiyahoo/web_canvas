export const MIN_GRAPH_ZOOM = 0.4;
export const MAX_GRAPH_ZOOM = 1.6;
export const GRAPH_ZOOM_STEP = 0.1;

export function clampGraphZoom(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_GRAPH_ZOOM, Math.max(MIN_GRAPH_ZOOM, Math.round(value * 100) / 100));
}

export function stepGraphZoom(current: number, direction: -1 | 1) {
  return clampGraphZoom(Math.round((current + direction * GRAPH_ZOOM_STEP) * 10) / 10);
}

export function fitGraphZoom(
  viewportWidth: number,
  viewportHeight: number,
  graphWidth: number,
  graphHeight: number,
  padding = 24,
) {
  if (viewportWidth <= 0 || viewportHeight <= 0 || graphWidth <= 0 || graphHeight <= 0) return 1;
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  return clampGraphZoom(Math.min(1, availableWidth / graphWidth, availableHeight / graphHeight));
}

export function graphCenterScroll({
  centerX,
  centerY,
  zoom,
  viewportWidth,
  viewportHeight,
  scrollWidth,
  scrollHeight,
}: {
  centerX: number;
  centerY: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollWidth: number;
  scrollHeight: number;
}) {
  const maxLeft = Math.max(0, scrollWidth - viewportWidth);
  const maxTop = Math.max(0, scrollHeight - viewportHeight);
  return {
    left: Math.min(maxLeft, Math.max(0, centerX * zoom - viewportWidth / 2)),
    top: Math.min(maxTop, Math.max(0, centerY * zoom - viewportHeight / 2)),
  };
}
