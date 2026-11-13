/**
 * Decides whether a comment thread opens to the right or to the left of its
 * pin, so threads near the right edge of the image open inwards.
 *
 * Layout facts this relies on (Liveblocks react-ui defaults):
 * - The pin uses corner="top-left", so its box starts at the anchor and is
 *   PIN_SIZE wide.
 * - side="right" puts the panel GAP px after the pin's right edge.
 * - side="left" puts the panel's right edge GAP px before the pin's left
 *   edge (the anchor).
 *
 * The rule, in container pixels:
 * 1. Work out the visible part of the image: the image clipped to the
 *    container.
 * 2. If the panel fits to the right within it, open right (the default).
 * 3. Otherwise, if it fits to the left, open left (inwards).
 * 4. If it fits on neither side (small or zoomed-out image), open towards
 *    the side with more room, so the panel covers as much image as it can.
 *
 * Radix (used by Liveblocks under the hood) still flips or shifts the panel
 * if it would leave the browser window; this rule only adds the image edge.
 */

export type ThreadSide = "left" | "right";

/** Liveblocks: --lb-comment-pin-size */
export const PIN_SIZE = 32;
/** Liveblocks: sideOffset of FloatingThread / FloatingComposer */
export const PANEL_GAP = 6;
/** Liveblocks: --lb-floating-thread-size / --lb-floating-composer-size */
export const PANEL_WIDTH = 350;

export type ThreadSideInput = {
  /** Anchor x in container px (the pin's left edge). */
  anchorX: number;
  /** Image left and right edges in container px. */
  imageLeft: number;
  imageRight: number;
  containerWidth: number;
  panelWidth?: number;
  pinSize?: number;
  gap?: number;
};

export function getThreadSide({
  anchorX,
  imageLeft,
  imageRight,
  containerWidth,
  panelWidth = PANEL_WIDTH,
  pinSize = PIN_SIZE,
  gap = PANEL_GAP,
}: ThreadSideInput): ThreadSide {
  const visibleLeft = Math.max(imageLeft, 0);
  const visibleRight = Math.min(imageRight, containerWidth);

  const roomRight = visibleRight - (anchorX + pinSize + gap);
  const roomLeft = anchorX - gap - visibleLeft;

  if (roomRight >= panelWidth) return "right";
  if (roomLeft >= panelWidth) return "left";
  return roomLeft > roomRight ? "left" : "right";
}

/**
 * Panel width that still fits on narrow screens: 350px, or the container
 * minus a 10px margin on each side. Must match the CSS in globals.css.
 */
export function getPanelWidth(containerWidth: number): number {
  return Math.max(Math.min(PANEL_WIDTH, containerWidth - 20), 0);
}
