"use client";

import { RoomProvider } from "@liveblocks/react";
import type { CanvasImage } from "../lib/rooms";
import { getRoomId } from "../lib/rooms";
import { ImageCanvas } from "./ImageCanvas";

/** Client-side root: one Liveblocks room per image. */
export function CommentingApp({ image }: { image: CanvasImage }) {
  return (
    <RoomProvider id={getRoomId(image)}>
      <header className="app-header">
        <h1>Image comments</h1>
        <p className="app-hint">
          Click the image to comment · Drag to pan · Ctrl/⌘ + scroll to zoom
        </p>
      </header>
      <ImageCanvas image={image} />
    </RoomProvider>
  );
}
