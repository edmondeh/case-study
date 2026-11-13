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
 * 4. If it fits on neither side of the image (small or zoomed-out image),
 *    prefer the side with more image, as long as the panel still fits on
 *    screen on that side; otherwise try the other side.
 * 5. If it fits on neither side of the screen (phones), open below the
 *    pin. Radix only slides a left/right panel up and down, never sideways,
 *    so a left/right panel would be cut off; a bottom panel is slid
 *    sideways to stay on screen.
 */

export type ThreadSide = "left" | "right" | "bottom";

/** Liveblocks: --lb-comment-pin-size */
export const PIN_SIZE = 32;
/** Liveblocks: sideOffset of FloatingThread / FloatingComposer */
export const PANEL_GAP = 6;
/** Liveblocks: --lb-floating-thread-size / --lb-floating-composer-size */
export const PANEL_WIDTH = 350;
/** Radix: collisionPadding, the margin it keeps from the window edge */
export const SCREEN_PADDING = 10;

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

  const rightEdgeOfPanel = anchorX + pinSize + gap + panelWidth;
  const leftEdgeOfPanel = anchorX - gap - panelWidth;

  // Rules 2 and 3: fits within the visible image.
  if (rightEdgeOfPanel <= visibleRight) return "right";
  if (leftEdgeOfPanel >= visibleLeft) return "left";

  // Rule 4: fits on screen, preferring the side with more image.
  const fitsRightOnScreen = rightEdgeOfPanel <= containerWidth - SCREEN_PADDING;
  const fitsLeftOnScreen = leftEdgeOfPanel >= SCREEN_PADDING;
  const imageRoomRight = visibleRight - (anchorX + pinSize + gap);
  const imageRoomLeft = anchorX - gap - visibleLeft;
  const preferred: ThreadSide =
    imageRoomLeft > imageRoomRight ? "left" : "right";
  const fits = { left: fitsLeftOnScreen, right: fitsRightOnScreen };
  if (fits[preferred]) return preferred;
  const other = preferred === "left" ? "right" : "left";
  if (fits[other]) return other;

  // Rule 5: no room beside the pin at all.
  return "bottom";
}

/**
 * Panel width that still fits on narrow screens: 350px, or the container
 * minus a 10px margin on each side. Must match the CSS in globals.css.
 */
export function getPanelWidth(containerWidth: number): number {
  return Math.max(Math.min(PANEL_WIDTH, containerWidth - 20), 0);
}
