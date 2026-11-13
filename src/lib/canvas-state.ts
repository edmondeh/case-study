import {
  clampPan,
  fitViewport,
  zoomAt,
  type Point,
  type Size,
  type Viewport,
} from "./geometry";

/**
 * Local (per-user) view state of the image canvas. This never goes to
 * Liveblocks: every user pans and zooms independently. Only comment anchors
 * are shared, and those are stored in image space (see geometry.ts).
 */
export type CanvasState = {
  /** Size of the canvas element, once measured. */
  container: Size | null;
  /** Natural size of the image, once loaded. */
  image: Size | null;
  viewport: Viewport;
  /**
   * While true, the image is re-fitted when the container resizes (e.g.
   * window resize or phone rotation). Cleared as soon as the user pans or
   * zooms, so we never undo their view; set again by "Fit".
   */
  autoFit: boolean;
};

export type CanvasAction =
  | { type: "containerResized"; size: Size }
  | { type: "imageLoaded"; size: Size }
  | { type: "fit" }
  | { type: "zoomBy"; factor: number; focal?: Point }
  | { type: "panBy"; dx: number; dy: number };

/** Each zoom button press multiplies or divides the scale by this. */
export const ZOOM_STEP = 1.25;

export const initialCanvasState: CanvasState = {
  container: null,
  image: null,
  viewport: { x: 0, y: 0, scale: 1 },
  autoFit: true,
};

export function canvasReducer(
  state: CanvasState,
  action: CanvasAction
): CanvasState {
  switch (action.type) {
    case "containerResized": {
      const next = { ...state, container: action.size };
      if (!next.image) return next;
      return {
        ...next,
        viewport: next.autoFit
          ? fitViewport(next.image, action.size)
          : clampPan(next.viewport, next.image, action.size),
      };
    }

    case "imageLoaded": {
      const next = { ...state, image: action.size, autoFit: true };
      if (!next.container) return next;
      return { ...next, viewport: fitViewport(action.size, next.container) };
    }

    case "fit": {
      if (!state.image || !state.container) return state;
      return {
        ...state,
        autoFit: true,
        viewport: fitViewport(state.image, state.container),
      };
    }

    case "zoomBy": {
      const { image, container, viewport } = state;
      if (!image || !container) return state;
      const focal = action.focal ?? {
        x: container.width / 2,
        y: container.height / 2,
      };
      const zoomed = zoomAt(viewport, viewport.scale * action.factor, focal);
      return withViewport(state, clampPan(zoomed, image, container));
    }

    case "panBy": {
      const { image, container, viewport } = state;
      if (!image || !container) return state;
      const panned = {
        ...viewport,
        x: viewport.x + action.dx,
        y: viewport.y + action.dy,
      };
      return withViewport(state, clampPan(panned, image, container));
    }
  }
}

/** Applies a user-driven viewport change; returns `state` if nothing moved. */
function withViewport(state: CanvasState, viewport: Viewport): CanvasState {
  const current = state.viewport;
  if (
    current.x === viewport.x &&
    current.y === viewport.y &&
    current.scale === viewport.scale
  ) {
    return state;
  }
  return { ...state, viewport, autoFit: false };
}
