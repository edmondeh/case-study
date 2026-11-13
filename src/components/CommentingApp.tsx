"use client";

import { RoomProvider } from "@liveblocks/react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import type { CanvasImage } from "../lib/rooms";
import { getRoomId } from "../lib/rooms";
import { ConnectionBanner } from "./ConnectionBanner";
import { ImageCanvas } from "./ImageCanvas";
import { ToastProvider } from "./Toasts";

/** Client-side root: one Liveblocks room per image. */
export function CommentingApp({ image }: { image: CanvasImage }) {
  return (
    <ToastProvider>
      <RoomProvider id={getRoomId(image)}>
        <header className="app-header">
          <h1>Image comments</h1>
          <p className="app-hint">
            Click the image to comment · Drag to pan · Ctrl/⌘ + scroll to zoom
          </p>
        </header>
        <ErrorBoundary FallbackComponent={CanvasCrashed}>
          <ConnectionBanner />
          <ImageCanvas image={image} />
        </ErrorBoundary>
      </RoomProvider>
    </ToastProvider>
  );
}

/** Last line of defence for unexpected render errors. */
function CanvasCrashed({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="canvas-message" role="alert">
      <strong>Something went wrong.</strong>
      <span>The canvas stopped working unexpectedly.</span>
      <button type="button" className="button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}
