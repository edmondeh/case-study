import type { LiveblocksErrorContext } from "@liveblocks/client";

/**
 * A short, human message for a failed comment action, or null when the
 * error is shown somewhere else (connection errors have their own banner)
 * or is not about comments.
 *
 * Liveblocks applies comment changes optimistically and rolls them back
 * when the server rejects them; without a message the user would just see
 * their comment disappear.
 */
export function describeCommentError(
  context: LiveblocksErrorContext
): string | null {
  switch (context.type) {
    case "CREATE_THREAD_ERROR":
      return "Your comment couldn't be posted. Your text is back in the box so you can try again.";
    case "CREATE_COMMENT_ERROR":
      return "Your reply couldn't be posted. Please try again.";
    case "EDIT_COMMENT_ERROR":
      return "Your edit couldn't be saved. Please try again.";
    case "DELETE_COMMENT_ERROR":
    case "DELETE_THREAD_ERROR":
      return "The comment couldn't be deleted. Please try again.";
    case "MARK_THREAD_AS_RESOLVED_ERROR":
    case "MARK_THREAD_AS_UNRESOLVED_ERROR":
    case "EDIT_THREAD_METADATA_ERROR":
      return "The thread couldn't be updated. Please try again.";
    case "ADD_REACTION_ERROR":
    case "REMOVE_REACTION_ERROR":
      return "Your reaction couldn't be saved. Please try again.";
    default:
      return null;
  }
}
