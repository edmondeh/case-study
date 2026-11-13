import { describe, expect, it } from "vitest";
import { getPanelWidth, getThreadSide } from "./thread-side";

// A 1000px wide image at (100..1100) inside a 1400px container.
const base = { imageLeft: 100, imageRight: 1100, containerWidth: 1400 };

describe("getThreadSide", () => {
  it("opens right when the panel fits before the image's right edge", () => {
    expect(getThreadSide({ ...base, anchorX: 200 })).toBe("right");
  });

  it("opens left (inwards) near the image's right edge", () => {
    expect(getThreadSide({ ...base, anchorX: 1050 })).toBe("left");
  });

  it("counts the pin and gap, not just the panel width", () => {
    // Space needed on the right: 32 (pin) + 6 (gap) + 350 (panel) = 388.
    expect(getThreadSide({ ...base, anchorX: 1100 - 388 })).toBe("right");
    expect(getThreadSide({ ...base, anchorX: 1100 - 387 })).toBe("left");
  });

  it("uses the container edge when the image is zoomed past it", () => {
    // The image extends far off screen to the right (zoomed in). A pin at the
    // visible right edge must still open inwards.
    const zoomed = { imageLeft: -2000, imageRight: 3000, containerWidth: 800 };
    expect(getThreadSide({ ...zoomed, anchorX: 700 })).toBe("left");
    expect(getThreadSide({ ...zoomed, anchorX: 100 })).toBe("right");
  });

  it("picks the side with more image when neither side fits", () => {
    // A 400px wide image, too small for a 350px panel on either side of
    // most pins.
    const small = { imageLeft: 500, imageRight: 900, containerWidth: 1400 };
    expect(getThreadSide({ ...small, anchorX: 520 })).toBe("right");
    expect(getThreadSide({ ...small, anchorX: 880 })).toBe("left");
  });

  it("respects a narrower panel on small screens", () => {
    const phone = { imageLeft: 0, imageRight: 375, containerWidth: 375 };
    const panelWidth = getPanelWidth(375); // 355 -> capped at 350
    expect(getThreadSide({ ...phone, anchorX: 10, panelWidth })).toBe("right");
    expect(getThreadSide({ ...phone, anchorX: 360, panelWidth })).toBe("left");
  });
});

describe("getPanelWidth", () => {
  it("is 350px on wide screens", () => {
    expect(getPanelWidth(1400)).toBe(350);
  });

  it("leaves a 10px margin each side on narrow screens", () => {
    expect(getPanelWidth(320)).toBe(300);
  });
});
