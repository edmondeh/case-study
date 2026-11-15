import { describe, expect, it } from "vitest";
import { DEFAULT_IMAGE, getImage, getRoomId, parseRoomVariant } from "./rooms";

describe("rooms", () => {
  it("gives every image its own room, optionally split by a variant", () => {
    expect(getRoomId(DEFAULT_IMAGE)).toBe("image-comments:landing-page");
    expect(getRoomId(DEFAULT_IMAGE, "e2e-123")).toBe(
      "image-comments:landing-page:e2e-123"
    );
  });

  it("only accepts short, URL-safe room variants", () => {
    expect(parseRoomVariant("demo_2")).toBe("demo_2");
    expect(parseRoomVariant("../other")).toBeUndefined();
    expect(parseRoomVariant("a".repeat(65))).toBeUndefined();
    expect(parseRoomVariant("")).toBeUndefined();
  });

  it("falls back to the default image for unknown ids", () => {
    expect(getImage("nope")).toBe(DEFAULT_IMAGE);
    expect(getImage("toString")).toBe(DEFAULT_IMAGE);
    expect(getImage("broken").id).toBe("broken");
  });
});
