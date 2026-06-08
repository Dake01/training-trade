import type { Session } from "@training-trade/shared";
import {
  ActiveSessionExistsError,
  SessionAlreadyClosedError,
  SessionNotFoundError,
} from "./errors";
import { toSession } from "./mappers";
import type { SessionDeps, SessionRepository } from "./types";

/**
 * Resume an existing session so it becomes active again (AC 1).
 *
 * Business rules enforced here:
 * - the session must exist, otherwise {@link SessionNotFoundError};
 * - an already `open` session is returned as-is (idempotent, no data loss);
 * - a `suspended` session transitions to `open`, bumping `updatedAt` while
 *   preserving `createdAt`, `openedAt` and `closedAt = null`;
 * - resuming is refused if another session is already `open`, with the same
 *   {@link ActiveSessionExistsError} conflict as creation;
 * - a `closed` session cannot be resumed ({@link SessionAlreadyClosedError});
 *   explicit reopen of a closed session is out of scope for this story.
 *
 * The read + write run inside `repo.transaction` so the single-active-session
 * invariant is enforced atomically and the session id is never reassigned.
 */
export function resumeSession(
  repo: SessionRepository,
  deps: SessionDeps,
  sessionId: string,
): Session {
  return repo.transaction((store) => {
    const record = store.findById(sessionId);
    if (!record) {
      throw new SessionNotFoundError();
    }

    if (record.status === "closed") {
      throw new SessionAlreadyClosedError();
    }

    if (record.status === "open") {
      // Already active: idempotent, return without touching history.
      return toSession(record);
    }

    // suspended -> open: refuse if another session already holds `open`.
    const active = store.findActive();
    if (active && active.id !== record.id) {
      throw new ActiveSessionExistsError();
    }

    const updated = {
      ...record,
      status: "open" as const,
      updatedAt: deps.clock.now().toISOString(),
      closedAt: null,
    };
    store.update(updated);
    return toSession(updated);
  });
}
