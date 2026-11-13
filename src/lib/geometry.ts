/**
 * Coordinate math for the image canvas.
 *
 * There are three coordinate spaces:
 *
 * - Container space: CSS pixels relative to the top-left corner of the
 *   canvas element (what you get from `clientX - rect.left`).
 * - Image space: pixels of the image at its natural size.
 * - Anchor space: image space normalized to 0..1, so (0, 0) is the image's
 *   top-left corner and (1, 1) its bottom-right corner.
 *
 * Comments are stored in anchor space. That makes a comment's position
 * independent of zoom, pan, screen size and even the image's resolution, so
 * the same thread metadata renders in the right place for every user.
 *
 * The viewport maps image space to container space:
 *   container = viewport.offset + image * viewport.scale
 */

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

/** Pan offset (container px) of the image's top-left corner, and zoom. */
export type Viewport = { x: number; y: number; scale: number };

/** A position on the image, normalized to 0..1 on both axes. */
export type Anchor = { x: number; y: number };

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 8;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampScale(scale: number): number {
  return clamp(scale, MIN_SCALE, MAX_SCALE);
}

/** Converts a point in container space to a normalized image anchor. */
export function containerToAnchor(
  point: Point,
  viewport: Viewport,
  image: Size
): Anchor {
  return {
    x: (point.x - viewport.x) / (image.width * viewport.scale),
    y: (point.y - viewport.y) / (image.height * viewport.scale),
  };
}

/** Converts a normalized image anchor to a point in container space. */
export function anchorToContainer(
  anchor: Anchor,
  viewport: Viewport,
  image: Size
): Point {
  return {
    x: viewport.x + anchor.x * image.width * viewport.scale,
    y: viewport.y + anchor.y * image.height * viewport.scale,
  };
}

/** True when the anchor lies on the image (edges included). */
export function isOnImage(anchor: Anchor): boolean {
  return anchor.x >= 0 && anchor.x <= 1 && anchor.y >= 0 && anchor.y <= 1;
}

/**
 * Type guard for thread metadata read from the server. Old or foreign
 * threads in the room may have missing, non-numeric or out-of-range
 * positions; those are skipped instead of rendering in a random place.
 */
export function isValidAnchor(value: unknown): value is Anchor {
  if (typeof value !== "object" || value === null) return false;
  const { x, y } = value as Record<string, unknown>;
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    isOnImage({ x, y })
  );
}

/**
 * Zooms to `nextScale` while keeping the image point under `focal`
 * (a container-space point) fixed on screen.
 *
 * The image point under the focal point is (focal - offset) / scale. For it
 * to stay under the focal point after zooming:
 *   offset' = focal - (focal - offset) * scale' / scale
 */
export function zoomAt(
  viewport: Viewport,
  nextScale: number,
  focal: Point
): Viewport {
  const scale = clampScale(nextScale);
  const ratio = scale / viewport.scale;
  return {
    scale,
    x: focal.x - (focal.x - viewport.x) * ratio,
    y: focal.y - (focal.y - viewport.y) * ratio,
  };
}

/**
 * The viewport that shows the whole image centred in the container, with
 * some padding. Small images are not enlarged past 100%.
 */
export function fitViewport(
  image: Size,
  container: Size,
  padding = 32
): Viewport {
  const availableWidth = Math.max(container.width - padding * 2, 1);
  const availableHeight = Math.max(container.height - padding * 2, 1);
  const scale = clampScale(
    Math.min(availableWidth / image.width, availableHeight / image.height, 1)
  );
  return {
    scale,
    x: (container.width - image.width * scale) / 2,
    y: (container.height - image.height * scale) / 2,
  };
}

/**
 * Limits panning so at least `minVisible` px of the image (or all of it,
 * if it is smaller) stays inside the container on each axis. Without this,
 * one hard drag can throw the image off screen.
 */
export function clampPan(
  viewport: Viewport,
  image: Size,
  container: Size,
  minVisible = 64
): Viewport {
  const width = image.width * viewport.scale;
  const height = image.height * viewport.scale;
  const keepX = Math.min(minVisible, width);
  const keepY = Math.min(minVisible, height);
  return {
    scale: viewport.scale,
    x: clamp(viewport.x, keepX - width, container.width - keepX),
    y: clamp(viewport.y, keepY - height, container.height - keepY),
  };
}
