"use client";

import type { CommentBody, ThreadData } from "@liveblocks/client";
import { useCreateThread, useSelf, useStatus } from "@liveblocks/react";
import {
  CommentPin,
  FloatingComposer,
  FloatingThread,
  type ComposerSubmitComment,
} from "@liveblocks/react-ui";
import type { ComponentPropsWithRef, FormEvent } from "react";
import { CANVAS_IGNORE_ATTRIBUTE } from "../hooks/canvas";
import {
  anchorToContainer,
  isValidAnchor,
  type Anchor,
  type Point,
  type Size,
  type Viewport,
} from "../lib/geometry";
import {
  getPanelWidth,
  getThreadSide,
  PIN_SIZE,
  type ThreadSide,
} from "../lib/thread-side";

/** What is open on the canvas. Only one thread or draft at a time. */
export type Selection =
  | { kind: "none" }
  | { kind: "draft"; anchor: Anchor; body?: CommentBody }
  | { kind: "thread"; threadId: string };

export const NO_SELECTION: Selection = { kind: "none" };

type Props = {
  threads: ThreadData[];
  viewport: Viewport;
  image: Size;
  container: Size;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onClose: () => void;
  /** Called right after a new thread is created (optimistically). */
  onCreated: (post: NewPost) => void;
  /** Called when the user resolves or deletes a thread themselves. */
  onRemovedByUser: (threadId: string) => void;
};

/** A just-submitted comment, kept so it can be restored if posting fails. */
export type NewPost = { threadId: string; anchor: Anchor; body: CommentBody };

/**
 * Renders a pin for every thread, plus the composer for a new comment.
 *
 * Pins live in an unscaled layer on top of the image and are positioned by
 * converting their anchor to container pixels. That keeps them exactly on
 * their spot at every zoom level while staying the same size on screen.
 */
export function CommentLayer({
  threads,
  viewport,
  image,
  container,
  selection,
  onSelect,
  onClose,
  onCreated,
  onRemovedByUser,
}: Props) {
  const panelWidth = getPanelWidth(container.width);

  function place(anchor: Anchor) {
    const point = anchorToContainer(anchor, viewport, image);
    const side = getThreadSide({
      anchorX: point.x,
      imageLeft: viewport.x,
      imageRight: viewport.x + image.width * viewport.scale,
      containerWidth: container.width,
      panelWidth,
    });
    return { point, side, visible: isInView(point, container) };
  }

  const draft =
    selection.kind === "draft"
      ? { ...selection, ...place(selection.anchor) }
      : null;

  return (
    <div className="comment-layer">
      {threads.map((thread) => {
        // Skip threads without a valid position (e.g. created by an older
        // version that stored pixels) instead of drawing them anywhere.
        if (!isValidAnchor(thread.metadata)) return null;
        const { point, side, visible } = place(thread.metadata);
        const isOpen =
          selection.kind === "thread" && selection.threadId === thread.id;
        // Skip pins scrolled out of view, except the open one: unmounting
        // it would throw away a reply being typed.
        if (!visible && !isOpen) return null;

        return (
          <ThreadPin
            key={thread.id}
            thread={thread}
            point={point}
            side={side}
            open={isOpen}
            onOpenChange={(open) => {
              if (open) onSelect({ kind: "thread", threadId: thread.id });
              else if (isOpen) onClose();
            }}
            onRemoved={() => onRemovedByUser(thread.id)}
          />
        );
      })}

      {draft && (
        <DraftComposer
          // A new key per spot resets the composer if the user starts over.
          key={`${draft.anchor.x},${draft.anchor.y}`}
          anchor={draft.anchor}
          initialBody={draft.body}
          point={draft.point}
          side={draft.side}
          onCreated={onCreated}
          onCancel={onClose}
        />
      )}
    </div>
  );
}

function ThreadPin({
  thread,
  point,
  side,
  open,
  onOpenChange,
  onRemoved,
}: {
  thread: ThreadData;
  point: Point;
  side: ThreadSide;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}) {
  const authorId = thread.comments[0]?.userId;
  return (
    <FloatingThread
      thread={thread}
      open={open}
      onOpenChange={onOpenChange}
      side={side}
      align="start"
      onResolvedChange={(resolved) => resolved && onRemoved()}
      onThreadDelete={onRemoved}
    >
      <PinPosition point={point}>
        <CommentPin
          userId={authorId}
          corner="top-left"
          aria-label="Open comment thread"
        />
      </PinPosition>
    </FloatingThread>
  );
}

function DraftComposer({
  anchor,
  initialBody,
  point,
  side,
  onCreated,
  onCancel,
}: {
  anchor: Anchor;
  initialBody?: CommentBody;
  point: Point;
  side: ThreadSide;
  onCreated: (post: NewPost) => void;
  onCancel: () => void;
}) {
  const createThread = useCreateThread();
  const selfId = useSelf((me) => me.id);
  // While offline, keep the text but block sending: a post sent without a
  // connection fails in a way Liveblocks doesn't report to listeners.
  const isOffline = useStatus() !== "connected";

  // We create the thread ourselves (instead of letting the composer do it)
  // to get the new thread's id, so it opens right after posting.
  function handleSubmit(comment: ComposerSubmitComment, event: FormEvent) {
    event.preventDefault();
    const thread = createThread({
      body: comment.body,
      attachments: comment.attachments,
      metadata: { x: anchor.x, y: anchor.y },
    });
    onCreated({ threadId: thread.id, anchor, body: comment.body });
  }

  return (
    <FloatingComposer
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      side={side}
      align="start"
      autoFocus
      disabled={isOffline}
      defaultValue={initialBody}
      onComposerSubmit={handleSubmit}
    >
      <PinPosition point={point}>
        <CommentPin
          userId={selfId ?? undefined}
          corner="top-left"
          aria-label="New comment"
        />
      </PinPosition>
    </FloatingComposer>
  );
}

/**
 * Places its child with its top-left corner on `point`. It is also the
 * trigger the floating thread/composer anchors to: Radix passes it a ref
 * and event handlers, so they are forwarded to the div (in React 19 `ref`
 * is a normal prop).
 */
function PinPosition({
  point,
  children,
  ...props
}: ComponentPropsWithRef<"div"> & { point: Point }) {
  return (
    <div
      {...props}
      {...{ [CANVAS_IGNORE_ATTRIBUTE]: "" }}
      className="pin"
      style={{ transform: `translate(${point.x}px, ${point.y}px)` }}
    >
      {children}
    </div>
  );
}

/** Pin is at least partly inside the canvas. */
function isInView(point: Point, container: Size): boolean {
  return (
    point.x > -PIN_SIZE &&
    point.y > -PIN_SIZE &&
    point.x < container.width &&
    point.y < container.height
  );
}
