import type { LiveblocksErrorContext } from "@liveblocks/client";
import { describe, expect, it } from "vitest";
import { describeCommentError } from "./comment-errors";

const body = { version: 1 as const, content: [] };

describe("describeCommentError", () => {
  it("explains a failed new comment and that the text was restored", () => {
    const context = {
      type: "CREATE_THREAD_ERROR",
      roomId: "image-comments:test",
      threadId: "th_1",
      commentId: "cm_1",
      body,
      visibility: "public",
      metadata: { x: 0.5, y: 0.5 },
      commentMetadata: {},
    } as LiveblocksErrorContext;
    expect(describeCommentError(context)).toMatch(/couldn't be posted/);
  });

  it("has a message for edits and deletes", () => {
    const edit = {
      type: "EDIT_COMMENT_ERROR",
      roomId: "r",
      threadId: "t",
      commentId: "c",
      body,
      metadata: {},
    } as LiveblocksErrorContext;
    const remove = {
      type: "DELETE_COMMENT_ERROR",
      roomId: "r",
      threadId: "t",
      commentId: "c",
    } as LiveblocksErrorContext;
    expect(describeCommentError(edit)).toMatch(/edit couldn't be saved/);
    expect(describeCommentError(remove)).toMatch(/couldn't be deleted/);
  });

  it("leaves connection errors to the connection banner", () => {
    const context = {
      type: "ROOM_CONNECTION_ERROR",
      code: -1,
      roomId: "r",
    } as LiveblocksErrorContext;
    expect(describeCommentError(context)).toBeNull();
  });
});
