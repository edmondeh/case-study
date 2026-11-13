import { describe, expect, it } from "vitest";
import {
  anchorToContainer,
  clampPan,
  containerToAnchor,
  fitViewport,
  isValidAnchor,
  MAX_SCALE,
  MIN_SCALE,
  zoomAt,
  type Viewport,
} from "./geometry";

const image = { width: 1000, height: 800 };

describe("containerToAnchor / anchorToContainer", () => {
  it("maps the image corners to 0 and 1", () => {
    const viewport: Viewport = { x: 100, y: 50, scale: 0.5 };
    expect(containerToAnchor({ x: 100, y: 50 }, viewport, image)).toEqual({
      x: 0,
      y: 0,
    });
    expect(containerToAnchor({ x: 600, y: 450 }, viewport, image)).toEqual({
      x: 1,
      y: 1,
    });
  });

  it("are inverses of each other", () => {
    const viewport: Viewport = { x: -37.5, y: 12.25, scale: 1.7 };
    const anchor = { x: 0.31, y: 0.77 };
    const point = anchorToContainer(anchor, viewport, image);
    const back = containerToAnchor(point, viewport, image);
    expect(back.x).toBeCloseTo(anchor.x, 10);
    expect(back.y).toBeCloseTo(anchor.y, 10);
  });

  it("returns values outside 0..1 for clicks off the image", () => {
    const viewport: Viewport = { x: 0, y: 0, scale: 1 };
    const anchor = containerToAnchor({ x: -10, y: 900 }, viewport, image);
    expect(anchor.x).toBeLessThan(0);
    expect(anchor.y).toBeGreaterThan(1);
  });
});

describe("zoomAt", () => {
  it("keeps the image point under the focal point fixed", () => {
    const viewport: Viewport = { x: 120, y: 80, scale: 1 };
    const focal = { x: 400, y: 300 };
    const anchorBefore = containerToAnchor(focal, viewport, image);

    const zoomed = zoomAt(viewport, 2.5, focal);
    const anchorAfter = containerToAnchor(focal, zoomed, image);

    expect(zoomed.scale).toBe(2.5);
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x, 10);
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y, 10);
  });

  it("keeps a comment pin on its anchor through zoom and pan", () => {
    // A pin placed by clicking (300, 200) at 100% zoom.
    let viewport: Viewport = { x: 0, y: 0, scale: 1 };
    const anchor = containerToAnchor({ x: 300, y: 200 }, viewport, image);
    expect(anchor).toEqual({ x: 0.3, y: 0.25 });

    // Zoom to 200% around the container centre, then pan 50px left.
    viewport = zoomAt(viewport, 2, { x: 500, y: 400 });
    viewport = { ...viewport, x: viewport.x - 50 };

    // Image pixel (300, 200) is now at 2 * 300 - 500 - 50 = 50 on x.
    expect(anchorToContainer(anchor, viewport, image)).toEqual({ x: 50, y: 0 });
  });

  it("clamps the scale to the allowed range", () => {
    const viewport: Viewport = { x: 0, y: 0, scale: 1 };
    expect(zoomAt(viewport, 100, { x: 0, y: 0 }).scale).toBe(MAX_SCALE);
    expect(zoomAt(viewport, 0.001, { x: 0, y: 0 }).scale).toBe(MIN_SCALE);
  });
});

describe("fitViewport", () => {
  it("scales a large image down and centres it", () => {
    const viewport = fitViewport(image, { width: 564, height: 864 }, 32);
    // Width is the limiting side: (564 - 64) / 1000 = 0.5
    expect(viewport.scale).toBe(0.5);
    expect(viewport.x).toBe(32);
    expect(viewport.y).toBe((864 - 400) / 2);
  });

  it("does not enlarge an image that already fits", () => {
    const viewport = fitViewport(
      { width: 200, height: 100 },
      { width: 1000, height: 1000 }
    );
    expect(viewport.scale).toBe(1);
    expect(viewport.x).toBe(400);
    expect(viewport.y).toBe(450);
  });
});

describe("clampPan", () => {
  const container = { width: 800, height: 600 };

  it("leaves a viewport that is in bounds untouched", () => {
    const viewport: Viewport = { x: 10, y: 20, scale: 0.5 };
    expect(clampPan(viewport, image, container)).toEqual(viewport);
  });

  it("keeps a strip of the image visible after a hard drag", () => {
    const viewport: Viewport = { x: 5000, y: -5000, scale: 1 };
    // Image left edge stops 64px before the container's right edge, and
    // its bottom edge stops 64px below the container's top edge.
    expect(clampPan(viewport, image, container, 64)).toEqual({
      x: 800 - 64,
      y: 64 - 800,
      scale: 1,
    });
  });
});

describe("isValidAnchor", () => {
  it("accepts normalized positions", () => {
    expect(isValidAnchor({ x: 0, y: 1 })).toBe(true);
    expect(isValidAnchor({ x: 0.5, y: 0.25 })).toBe(true);
  });

  it("rejects pixel positions and malformed metadata", () => {
    expect(isValidAnchor({ x: 640, y: 320 })).toBe(false);
    expect(isValidAnchor({ x: -0.1, y: 0.5 })).toBe(false);
    expect(isValidAnchor({ x: Number.NaN, y: 0.5 })).toBe(false);
    expect(isValidAnchor({ x: "0.5", y: 0.5 })).toBe(false);
    expect(isValidAnchor(null)).toBe(false);
    expect(isValidAnchor(undefined)).toBe(false);
  });
});
