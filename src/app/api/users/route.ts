import { NextRequest, NextResponse } from "next/server";
import { getUser } from "../../../database";

/**
 * Returns user info for the given ids, in the same order. Used by
 * `resolveUsers` in Providers.tsx to show names and avatars on comments.
 * Unknown ids resolve to `null`, which Liveblocks shows as an anonymous user.
 */
export async function GET(request: NextRequest) {
  const userIds = request.nextUrl.searchParams.getAll("userIds");
  if (userIds.length === 0) {
    return new NextResponse("Missing userIds", { status: 400 });
  }
  return NextResponse.json(userIds.map((id) => getUser(id)?.info ?? null));
}
