"use client";

import type { Status } from "@liveblocks/client";
import {
  useErrorListener,
  useRoom,
  useStatus,
  useThreads,
} from "@liveblocks/react";
import { useEffect, useState } from "react";

/**
 * A connection state that lasts longer than this is reported as a problem.
 * The Liveblocks client keeps retrying network and 5xx errors silently, so
 * without this the user could wait forever with no feedback.
 */
const SLOW_CONNECTION_MS = 8000;

type Banner = {
  tone: "warning" | "error";
  message: string;
  detail?: string;
  action?: "retry" | "reload";
};

/** What to tell the user for a given connection state, if anything. */
export function getConnectionBanner({
  status,
  isSlow,
  reason,
  threadsFailed,
}: {
  status: Status;
  isSlow: boolean;
  reason: string | null;
  threadsFailed: boolean;
}): Banner | null {
  switch (status) {
    case "connected":
      return threadsFailed
        ? {
            tone: "error",
            message: "Comments couldn't be loaded.",
            action: "reload",
          }
        : null;
    case "reconnecting":
      return {
        tone: "warning",
        message: "Connection lost. Reconnecting… New comments are paused.",
        action: isSlow ? "retry" : undefined,
      };
    case "disconnected":
      return {
        tone: "error",
        message: "Couldn't connect to the comment server.",
        detail: reason ?? undefined,
        action: "retry",
      };
    default:
      // "initial" or "connecting": stay quiet unless it takes too long.
      return isSlow
        ? {
            tone: "warning",
            message: "Still connecting to the comment server…",
            action: "retry",
          }
        : null;
  }
}

/**
 * Tells the user when comments are not live: still connecting, connection
 * lost, connection refused (e.g. bad key), or threads failed to load.
 * Viewing, panning and zooming the image keep working in all these cases.
 */
export function ConnectionBanner() {
  const status = useStatus();
  const room = useRoom();
  const { error: threadsError } = useThreads({ query: { resolved: false } });
  const [reason, setReason] = useState<string | null>(null);
  const [slowStatus, setSlowStatus] = useState<Status | null>(null);

  // Keep the server's reason (e.g. "LIVEBLOCKS_SECRET_KEY is not set") to
  // show alongside a refused connection.
  useErrorListener((error) => {
    if (error.context.type === "ROOM_CONNECTION_ERROR") {
      setReason(error.message);
    }
  });

  // Remember a status as "slow" once it has lasted SLOW_CONNECTION_MS. Any
  // status change makes `slowStatus` stale, so the banner resets itself.
  useEffect(() => {
    if (status === "connected" || status === "disconnected") return;
    const timer = window.setTimeout(
      () => setSlowStatus(status),
      SLOW_CONNECTION_MS
    );
    return () => window.clearTimeout(timer);
  }, [status]);

  const banner = getConnectionBanner({
    status,
    isSlow: slowStatus === status,
    reason,
    threadsFailed: threadsError !== undefined,
  });
  if (!banner) return null;

  return (
    <div className="banner" role="alert" data-tone={banner.tone}>
      <div className="banner-text">
        <strong>{banner.message}</strong>
        {banner.detail && <span>{banner.detail}</span>}
      </div>
      {banner.action === "retry" && (
        <button type="button" className="button" onClick={() => room.reconnect()}>
          Retry
        </button>
      )}
      {banner.action === "reload" && (
        <button
          type="button"
          className="button"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      )}
    </div>
  );
}
