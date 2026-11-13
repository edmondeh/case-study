import { describe, expect, it } from "vitest";
import {
  canvasReducer,
  initialCanvasState,
  ZOOM_STEP,
  type CanvasAction,
  type CanvasState,
} from "./canvas-state";
import { MAX_SCALE } from "./geometry";

const container = { width: 1064, height: 864 };
const image = { width: 2000, height: 1600 };

function run(actions: CanvasAction[], state = initialCanvasState) {
  return actions.reduce(canvasReducer, state);
}

const loaded: CanvasState = run([
  { type: "containerResized", size: container },
  { type: "imageLoaded", size: image },
]);

describe("canvasReducer", () => {
  it("fits the image once both sizes are known, in either order", () => {
    const imageFirst = run([
      { type: "imageLoaded", size: image },
      { type: "containerResized", size: container },
    ]);
    // (1064 - 64) / 2000 = 0.5 and (864 - 64) / 1600 = 0.5
    expect(loaded.viewport).toEqual({ x: 32, y: 32, scale: 0.5 });
    expect(imageFirst.viewport).toEqual(loaded.viewport);
  });

  it("ignores zoom and pan before the image has loaded", () => {
    const state = run([
      { type: "zoomBy", factor: 2 },
      { type: "panBy", dx: 5, dy: 5 },
    ]);
    expect(state).toEqual(initialCanvasState);
  });

  it("zooms around the container centre by default", () => {
    const zoomed = canvasReducer(loaded, { type: "zoomBy", factor: ZOOM_STEP });
    expect(zoomed.viewport.scale).toBeCloseTo(0.625);
    // The image point at the centre (532, 432) stays at the centre.
    const centreX = (532 - loaded.viewport.x) / loaded.viewport.scale;
    expect(zoomed.viewport.x + centreX * zoomed.viewport.scale).toBeCloseTo(
      532
    );
    expect(zoomed.autoFit).toBe(false);
  });

  it("zooming in then out returns to the same view", () => {
    const state = run(
      [
        { type: "zoomBy", factor: ZOOM_STEP },
        { type: "zoomBy", factor: 1 / ZOOM_STEP },
      ],
      loaded
    );
    expect(state.viewport.scale).toBeCloseTo(loaded.viewport.scale);
    expect(state.viewport.x).toBeCloseTo(loaded.viewport.x);
    expect(state.viewport.y).toBeCloseTo(loaded.viewport.y);
  });

  it("returns the same state object when zoom is already at the limit", () => {
    const maxed = canvasReducer(loaded, { type: "zoomBy", factor: 1000 });
    expect(maxed.viewport.scale).toBe(MAX_SCALE);
    expect(canvasReducer(maxed, { type: "zoomBy", factor: 2 })).toBe(maxed);
  });

  it("pans by the pointer delta", () => {
    const panned = canvasReducer(loaded, { type: "panBy", dx: -40, dy: 25 });
    expect(panned.viewport).toEqual({ x: -8, y: 57, scale: 0.5 });
  });

  it("re-fits on resize until the user moves the view", () => {
    const smaller = { width: 564, height: 864 };
    const refitted = canvasReducer(loaded, {
      type: "containerResized",
      size: smaller,
    });
    expect(refitted.viewport.scale).toBe(0.25);

    const moved = canvasReducer(loaded, { type: "panBy", dx: 10, dy: 0 });
    const kept = canvasReducer(moved, {
      type: "containerResized",
      size: smaller,
    });
    expect(kept.viewport.scale).toBe(0.5);
  });

  it("'fit' restores the fitted view and re-enables auto-fit", () => {
    const state = run(
      [
        { type: "zoomBy", factor: 3 },
        { type: "panBy", dx: 100, dy: 100 },
        { type: "fit" },
      ],
      loaded
    );
    expect(state.viewport).toEqual(loaded.viewport);
    expect(state.autoFit).toBe(true);
  });
});
