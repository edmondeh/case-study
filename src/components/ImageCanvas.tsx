"use client";

import { useStatus, useThreads } from "@liveblocks/react";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  canvasReducer,
  initialCanvasState,
  ZOOM_STEP,
} from "../lib/canvas-state";
import { containerToAnchor, isOnImage, type Point } from "../lib/geometry";
import type { CanvasImage } from "../lib/rooms";
import {
  useContainerSize,
  usePanGesture,
  useWheelNavigation,
  useZoomShortcuts,
} from "../hooks/canvas";
import { CommentLayer, NO_SELECTION, type Selection } from "./CommentLayer";
import { ZoomControls } from "./ZoomControls";

/**
 * Within this many ms of a thread or composer closing, a tap only counts as
 * "close", not "add a comment" (see handlePointerDown).
 */
const CLOSE_GRACE_MS = 100;

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

  const connection = useStatus();
  const { threads } = useThreads({ query: { resolved: false } });
  const [selection, setSelection] = useState<Selection>(NO_SELECTION);

  // A click outside an open thread or composer should only close it, like
  // in Figma, not also start a new comment. Radix closes the popover on
  // pointerdown, so by the time our tap fires (pointerup) the selection is
  // already empty. We therefore decide at pointerdown, and also remember
  // when something closed in case Radix's listener ran first.
  const closedAt = useRef(0);
  const tapOnlyCloses = useRef(false);

  const closeSelection = useCallback(() => {
    closedAt.current = performance.now();
    setSelection(NO_SELECTION);
  }, []);

  function handleTap(point: Point) {
    if (tapOnlyCloses.current) {
      setSelection(NO_SELECTION);
      return;
    }
    if (!state.image) return;
    const anchor = containerToAnchor(point, viewport, state.image);
    if (!isOnImage(anchor)) return;
    if (connection !== "connected") return;
    setSelection({ kind: "draft", anchor });
  }

  const { isPanning, handlers } = usePanGesture({
    containerRef,
    onPan: (dx, dy) => dispatch({ type: "panBy", dx, dy }),
    onTap: handleTap,
  });

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    tapOnlyCloses.current =
      selection.kind !== "none" ||
      performance.now() - closedAt.current < CLOSE_GRACE_MS;
    handlers.onPointerDown(event);
  }

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
        onPointerDown={handlePointerDown}
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

        {isLoaded && state.image && state.container && (
          <CommentLayer
            threads={threads ?? []}
            viewport={viewport}
            image={state.image}
            container={state.container}
            selection={selection}
            onSelect={setSelection}
            onClose={closeSelection}
          />
        )}

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
