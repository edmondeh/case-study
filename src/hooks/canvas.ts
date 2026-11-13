import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { CanvasAction } from "../lib/canvas-state";
import { ZOOM_STEP } from "../lib/canvas-state";
import type { Point } from "../lib/geometry";

/**
 * Pointer movement (px) below which a press counts as a click, not a drag.
 * Small enough to feel instant, big enough to absorb a shaky click.
 */
export const DRAG_THRESHOLD = 4;

/** Elements inside the canvas that handle their own pointer events. */
export const CANVAS_IGNORE_ATTRIBUTE = "data-canvas-ignore";

/** Reports the container's size on mount and whenever it changes. */
export function useContainerSize(
  ref: RefObject<HTMLElement | null>,
  dispatch: Dispatch<CanvasAction>
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      dispatch({ type: "containerResized", size: { width, height } });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, dispatch]);
}

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  isDrag: boolean;
};

/**
 * Drag to pan, click to "tap" a point, using one set of pointer events so
 * it works the same for mouse, pen and touch.
 *
 * A press only becomes a drag after moving DRAG_THRESHOLD px; releasing
 * before that is a tap at the container-space point where it started.
 */
export function usePanGesture({
  containerRef,
  onPan,
  onTap,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onPan: (dx: number, dy: number) => void;
  onTap: (point: Point) => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    const container = containerRef.current;
    const target = event.target as Element;
    if (!container || !event.isPrimary || event.button !== 0) return;
    // React bubbles events from portals (open threads and composers live in
    // document.body) through the component tree, so check the real DOM.
    if (!container.contains(target)) return;
    if (target.closest(`[${CANVAS_IGNORE_ATTRIBUTE}]`)) return;

    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      isDrag: false,
    };
    // Keep receiving moves even if the pointer leaves the canvas mid-drag.
    container.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;

    if (!current.isDrag) {
      const distance = Math.hypot(
        event.clientX - current.startX,
        event.clientY - current.startY
      );
      if (distance < DRAG_THRESHOLD) return;
      current.isDrag = true;
      setIsPanning(true);
    }

    onPan(event.clientX - current.lastX, event.clientY - current.lastY);
    current.lastX = event.clientX;
    current.lastY = event.clientY;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    setIsPanning(false);

    const container = containerRef.current;
    if (current.isDrag || !container) return;
    const rect = container.getBoundingClientRect();
    onTap({ x: current.startX - rect.left, y: current.startY - rect.top });
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    setIsPanning(false);
  }

  return {
    isPanning,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}

/**
 * Trackpad and mouse wheel navigation, like most design tools:
 * - Scroll (two-finger swipe) pans.
 * - Ctrl/Cmd + scroll zooms around the cursor. Trackpad pinch gestures are
 *   reported by browsers as ctrl + wheel, so pinch-to-zoom works too.
 *
 * Uses a native listener because React's onWheel is passive and cannot
 * stop the page from scrolling or the browser from zooming.
 */
export function useWheelNavigation(
  ref: RefObject<HTMLElement | null>,
  dispatch: Dispatch<CanvasAction>
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      // deltaMode 1 means "lines" (some mice); convert to pixels.
      const unit = event.deltaMode === 1 ? 16 : 1;
      const dx = event.deltaX * unit;
      const dy = event.deltaY * unit;

      if (event.ctrlKey || event.metaKey) {
        const rect = element!.getBoundingClientRect();
        dispatch({
          type: "zoomBy",
          factor: Math.exp(-dy * 0.002),
          focal: { x: event.clientX - rect.left, y: event.clientY - rect.top },
        });
      } else {
        dispatch({ type: "panBy", dx: -dx, dy: -dy });
      }
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [ref, dispatch]);
}

/** "+" / "-" to zoom and "0" to fit, unless the user is typing. */
export function useZoomShortcuts(dispatch: Dispatch<CanvasAction>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
      if (event.altKey || isEditable(event.target)) return;

      if (event.key === "+" || event.key === "=") {
        dispatch({ type: "zoomBy", factor: ZOOM_STEP });
      } else if (event.key === "-" || event.key === "_") {
        dispatch({ type: "zoomBy", factor: 1 / ZOOM_STEP });
      } else if (event.key === "0") {
        dispatch({ type: "fit" });
      } else {
        return;
      }
      event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}
