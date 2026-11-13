import { NextRequest, NextResponse } from "next/server";
import { USERS } from "../../../../database";

/**
 * Returns the ids of users whose name contains `text`. Used by
 * `resolveMentionSuggestions` in Providers.tsx for @mentions.
 */
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text")?.toLowerCase() ?? "";
  const ids = USERS.filter((user) =>
    user.info.name.toLowerCase().includes(text)
  ).map((user) => user.id);
  return NextResponse.json(ids);
}
