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

  it("picks the side with more image when neither side fits the image", () => {
    // A 400px wide image, too small for a 350px panel beside most pins,
    // in a wide window where both sides fit on screen.
    const small = { imageLeft: 500, imageRight: 900, containerWidth: 1400 };
    // Left room 14px, right room 342px: right.
    expect(getThreadSide({ ...small, anchorX: 520 })).toBe("right");
    // Left room 344px, right room 12px: left, though it doesn't fit the image.
    expect(getThreadSide({ ...small, anchorX: 850 })).toBe("left");
  });

  it("uses the other side when the preferred one would leave the screen", () => {
    // A small image hugging the window's right edge (panned there). The pin
    // is in the image's left half, so "right" has more image (42px vs
    // 14px), but a right panel would end at 720 + 388 = 1108 > 790.
    const input = { imageLeft: 700, imageRight: 800, containerWidth: 800 };
    expect(getThreadSide({ ...input, anchorX: 720 })).toBe("left");
  });

  it("opens below the pin when nothing fits beside it (phones)", () => {
    // A 375px phone with the image fitted 32..343.
    const phone = { imageLeft: 32, imageRight: 343, containerWidth: 375 };
    const panelWidth = getPanelWidth(375); // 350
    expect(getThreadSide({ ...phone, anchorX: 180, panelWidth })).toBe(
      "bottom"
    );
    expect(getThreadSide({ ...phone, anchorX: 40, panelWidth })).toBe("bottom");
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
