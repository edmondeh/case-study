"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  canvasReducer,
  initialCanvasState,
  ZOOM_STEP,
} from "../lib/canvas-state";
import type { Point } from "../lib/geometry";
import type { CanvasImage } from "../lib/rooms";
import {
  useContainerSize,
  usePanGesture,
  useWheelNavigation,
  useZoomShortcuts,
} from "../hooks/canvas";
import { ZoomControls } from "./ZoomControls";

type ImageStatus = "loading" | "loaded" | "error";

/**
 * The image, panned and zoomed with one CSS transform. The view state lives
 * in a reducer (lib/canvas-state.ts) so all the maths is unit-tested.
 */
export function ImageCanvas({ image }: { image: CanvasImage }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [state, dispatch] = useReducer(canvasReducer, initialCanvasState);
  const [status, setStatus] = useState<ImageStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const { viewport } = state;

  // Bust the browser cache on retries so a failed request is really retried.
  const src = attempt === 0 ? image.src : `${image.src}?retry=${attempt}`;

  const handleImageLoad = useCallback((element: HTMLImageElement) => {
    // An image without intrinsic size (e.g. an SVG with no width/height)
    // cannot be positioned reliably; treat it as broken.
    if (element.naturalWidth === 0 || element.naturalHeight === 0) {
      setStatus("error");
      return;
    }
    dispatch({
      type: "imageLoaded",
      size: { width: element.naturalWidth, height: element.naturalHeight },
    });
    setStatus("loaded");
  }, []);

  // The image can finish loading before React hydrates and attaches onLoad
  // (e.g. from cache), so check once on mount and after each retry.
  useEffect(() => {
    const element = imageRef.current;
    if (element?.complete) {
      if (element.naturalWidth > 0) handleImageLoad(element);
      else setStatus("error");
    }
  }, [src, handleImageLoad]);

  useContainerSize(containerRef, dispatch);
  useWheelNavigation(containerRef, dispatch);
  useZoomShortcuts(dispatch);

  const handleTap = useCallback((_point: Point) => {
    // Comments are added here in a later step.
  }, []);

  const { isPanning, handlers } = usePanGesture({
    containerRef,
    onPan: (dx, dy) => dispatch({ type: "panBy", dx, dy }),
    onTap: handleTap,
  });

  function retry() {
    setStatus("loading");
    setAttempt((count) => count + 1);
  }

  const isLoaded = status === "loaded" && state.image !== null;

  return (
    <>
      <div
        ref={containerRef}
        className="canvas"
        data-panning={isPanning || undefined}
        {...handlers}
      >
        <div
          className="canvas-image"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            visibility: isLoaded ? "visible" : "hidden",
          }}
        >
          {/* A plain <img>, not next/image: we need its natural size and
              load/error events, and it is scaled by the transform anyway. */}
          <img
            ref={imageRef}
            key={src}
            src={src}
            alt={image.alt}
            draggable={false}
            style={state.image ?? undefined}
            onLoad={(event) => handleImageLoad(event.currentTarget)}
            onError={() => setStatus("error")}
          />
        </div>

        {status === "loading" && (
          <div className="canvas-message" role="status">
            <span className="spinner" aria-hidden="true" />
            Loading image…
          </div>
        )}

        {status === "error" && (
          <div className="canvas-message" role="alert">
            <strong>The image could not be loaded.</strong>
            <span>Check your connection and try again.</span>
            <button type="button" className="button" onClick={retry}>
              Try again
            </button>
          </div>
        )}
      </div>

      <ZoomControls
        scale={viewport.scale}
        disabled={!isLoaded}
        onZoomIn={() => dispatch({ type: "zoomBy", factor: ZOOM_STEP })}
        onZoomOut={() => dispatch({ type: "zoomBy", factor: 1 / ZOOM_STEP })}
        onFit={() => dispatch({ type: "fit" })}
      />
    </>
  );
}
