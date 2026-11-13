import { describe, expect, it } from "vitest";
import { getConnectionBanner } from "./ConnectionBanner";

const base = { isSlow: false, reason: null, threadsFailed: false };

describe("getConnectionBanner", () => {
  it("shows nothing when connected", () => {
    expect(getConnectionBanner({ ...base, status: "connected" })).toBeNull();
  });

  it("stays quiet while connecting, until it takes too long", () => {
    expect(getConnectionBanner({ ...base, status: "connecting" })).toBeNull();
    expect(
      getConnectionBanner({ ...base, status: "connecting", isSlow: true })
    ).toMatchObject({ tone: "warning", action: "retry" });
  });

  it("shows the server's reason when the connection is refused", () => {
    const banner = getConnectionBanner({
      ...base,
      status: "disconnected",
      reason: "LIVEBLOCKS_SECRET_KEY is not set.",
    });
    expect(banner).toMatchObject({
      tone: "error",
      detail: "LIVEBLOCKS_SECRET_KEY is not set.",
      action: "retry",
    });
  });

  it("warns while reconnecting, with retry once it is slow", () => {
    expect(
      getConnectionBanner({ ...base, status: "reconnecting" })?.action
    ).toBeUndefined();
    expect(
      getConnectionBanner({ ...base, status: "reconnecting", isSlow: true })
        ?.action
    ).toBe("retry");
  });

  it("offers a reload when threads failed to load", () => {
    expect(
      getConnectionBanner({ ...base, status: "connected", threadsFailed: true })
    ).toMatchObject({ tone: "error", action: "reload" });
  });
});
