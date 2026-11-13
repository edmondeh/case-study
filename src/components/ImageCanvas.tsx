"use client";

import { useErrorListener, useStatus, useThreads } from "@liveblocks/react";
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
import {
  describeCommentError,
  POST_FAILED_MESSAGE,
} from "../lib/comment-errors";
import {
  containerToAnchor,
  isOnImage,
  isValidAnchor,
  type Point,
} from "../lib/geometry";
import type { CanvasImage } from "../lib/rooms";
import {
  useContainerSize,
  usePanGesture,
  useWheelNavigation,
  useZoomShortcuts,
} from "../hooks/canvas";
import {
  CommentLayer,
  NO_SELECTION,
  type NewPost,
  type Selection,
} from "./CommentLayer";
import { useToast } from "./Toasts";
import { ZoomControls } from "./ZoomControls";

/**
 * If a thread we just posted disappears within this time without an error
 * event, we assume posting failed (see the pendingPost effect).
 */
const PENDING_POST_MS = 10_000;

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
  const showToast = useToast();

  // The open thread can disappear without Radix telling us (resolved,
  // deleted, or removed by another user). Treat that as nothing open, so
  // the next click on the image isn't swallowed as a "close" click.
  const activeSelection: Selection =
    selection.kind === "thread" &&
    !threads?.some((thread) => thread.id === selection.threadId)
      ? NO_SELECTION
      : selection;

  // The comment we just posted, until we know it wasn't rolled back.
  const pendingPost = useRef<(NewPost & { postedAt: number }) | null>(null);

  const handleCreated = useCallback((post: NewPost) => {
    pendingPost.current = { ...post, postedAt: performance.now() };
    setSelection({ kind: "thread", threadId: post.threadId });
  }, []);

  const restoreDraft = useCallback((post: Omit<NewPost, "threadId">) => {
    setSelection({ kind: "draft", anchor: post.anchor, body: post.body });
  }, []);

  // Liveblocks rolls back a comment action the server rejects. Explain what
  // happened, and for a new comment reopen the composer with the text.
  useErrorListener((error) => {
    const message = describeCommentError(error.context);
    if (!message) return;
    showToast(message, "error");

    const { context } = error;
    if (
      context.type === "CREATE_THREAD_ERROR" &&
      isValidAnchor(context.metadata)
    ) {
      pendingPost.current = null;
      restoreDraft({ anchor: context.metadata, body: context.body });
    }
  });

  // When posting fails because of the network (not an HTTP error),
  // Liveblocks 3.25 rolls the thread back without an error event. Detect
  // that: our new thread vanished shortly after posting, and the user
  // didn't resolve or delete it.
  useEffect(() => {
    const pending = pendingPost.current;
    if (!pending || !threads) return;
    if (threads.some((thread) => thread.id === pending.threadId)) return;
    pendingPost.current = null;
    if (performance.now() - pending.postedAt > PENDING_POST_MS) return;
    showToast(POST_FAILED_MESSAGE, "error");
    restoreDraft(pending);
  }, [threads, showToast, restoreDraft]);

  const handleRemovedByUser = useCallback((threadId: string) => {
    if (pendingPost.current?.threadId === threadId) {
      pendingPost.current = null;
    }
  }, []);

  // A click outside an open thread or composer should only close it, like
  // in Figma, not also start a new comment. Radix closes the popover on the
  // click that follows the press, after our tap (pointerup) has run, so we
  // decide at pointerdown whether something is open.
  const tapOnlyCloses = useRef(false);

  const closeSelection = useCallback(() => setSelection(NO_SELECTION), []);

  function handleTap(point: Point) {
    if (tapOnlyCloses.current) {
      setSelection(NO_SELECTION);
      return;
    }
    if (!state.image) return;
    const anchor = containerToAnchor(point, viewport, state.image);
    if (!isOnImage(anchor)) return;
    if (connection !== "connected") {
      showToast(
        "Comments are offline right now. You can add one once the connection is back."
      );
      return;
    }
    setSelection({ kind: "draft", anchor });
  }

  const { isPanning, handlers } = usePanGesture({
    containerRef,
    onPan: (dx, dy) => dispatch({ type: "panBy", dx, dy }),
    onTap: handleTap,
  });

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    tapOnlyCloses.current = activeSelection.kind !== "none";
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
            selection={activeSelection}
            onSelect={setSelection}
            onClose={closeSelection}
            onCreated={handleCreated}
            onRemovedByUser={handleRemovedByUser}
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
