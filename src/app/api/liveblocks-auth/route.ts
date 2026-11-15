import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { getRandomUser, getUser } from "../../../database";
import { ROOM_PREFIX } from "../../../lib/rooms";

/**
 * Liveblocks access-token auth.
 * https://liveblocks.io/docs/authentication/access-token
 *
 * Error responses use 403 with a plain-text reason on purpose: the
 * Liveblocks client stops retrying on 403 (it would retry a 5xx forever) and
 * puts the response text into the connection error, which the UI shows.
 */

const USER_COOKIE = "image-comments-user";
const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    return textResponse(
      "LIVEBLOCKS_SECRET_KEY is not set. Add it to .env.local and restart the dev server.",
      403
    );
  }

  // Created per request rather than at module load: a missing or malformed
  // key would otherwise throw while importing this file, which breaks
  // `next build` and turns every request into an empty 500.
  let liveblocks: Liveblocks;
  try {
    liveblocks = new Liveblocks({ secret });
  } catch {
    return textResponse(
      "LIVEBLOCKS_SECRET_KEY is not a valid secret key (it should start with sk_). Copy it again from the Liveblocks dashboard.",
      403
    );
  }

  // Keep the same demo user for this browser across reloads, so people can
  // edit and delete their own comments. A new browser (or a private window)
  // gets a new random user, which is handy for testing collaboration.
  const existingUser = getUser(request.cookies.get(USER_COOKIE)?.value);
  const user = existingUser ?? getRandomUser();

  await ensureRoomExists(liveblocks, await readRoomId(request));

  const session = liveblocks.prepareSession(user.id, { userInfo: user.info });
  session.allow(`${ROOM_PREFIX}*`, session.FULL_ACCESS);

  try {
    const { status, body } = await session.authorize();
    if (status === 401 || status === 403) {
      // Liveblocks' JSON error is meant for developers; log it and send the
      // user one readable sentence instead.
      console.error("Liveblocks rejected the secret key", status, body);
      return textResponse(
        "Liveblocks rejected LIVEBLOCKS_SECRET_KEY. Check that it is the secret key (sk_…) of your Liveblocks project.",
        403
      );
    }
    const response = new NextResponse(body, { status });
    if (!existingUser) {
      response.cookies.set(USER_COOKIE, user.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: ONE_MONTH_IN_SECONDS,
      });
    }
    return response;
  } catch (error) {
    console.error("Liveblocks authorization failed", error);
    // 503 is retried by the client, which is what we want for a network
    // problem between this server and Liveblocks.
    return textResponse("Could not reach Liveblocks. Retrying…", 503);
  }
}

/** Rooms this server process has already made sure exist. */
const knownRooms = new Set<string>();

/**
 * Creates the room before the client connects to it. When a room doesn't
 * exist yet, Liveblocks' first answer to the client says comments can't be
 * written there, so the very first visitor of a room (e.g. someone running
 * the app with a fresh key) got a disabled comment box until they reloaded.
 * Failing here must not block sign-in, so errors are only logged.
 */
async function ensureRoomExists(liveblocks: Liveblocks, roomId?: string) {
  if (!roomId || knownRooms.has(roomId)) return;
  try {
    // No default access: only people with a token from this route get in.
    await liveblocks.getOrCreateRoom(roomId, { defaultAccesses: [] });
    knownRooms.add(roomId);
  } catch (error) {
    console.error("Could not create Liveblocks room", roomId, error);
  }
}

/** The Liveblocks client sends `{ room }` when it needs a room token. */
async function readRoomId(request: NextRequest): Promise<string | undefined> {
  const body: unknown = await request.json().catch(() => null);
  const room =
    typeof body === "object" && body !== null && "room" in body
      ? body.room
      : undefined;
  return typeof room === "string" && room.startsWith(ROOM_PREFIX)
    ? room
    : undefined;
}

function textResponse(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
