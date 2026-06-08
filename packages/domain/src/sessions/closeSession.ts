import type { Session } from "@training-trade/shared";
import {
  SessionAlreadyClosedError,
  SessionNotActiveError,
  SessionNotFoundError,
} from "./errors";
import { toSession } from "./mappers";
import type { SessionDeps, SessionRepository } from "./types";

/**
 * Close an active session so it can no longer receive decisions (AC 2).
 *
 * Business rules enforced here:
 * - the session must exist, otherwise {@link SessionNotFoundError};
 * - only an `open` session can be closed;
 * - an already `closed` session yields {@link SessionAlreadyClosedError};
 * - a `suspended` session yields {@link SessionNotActiveError} (closing a
 *   suspended session is out of scope for this story);
 * - on success the session moves to `closed`, with `updatedAt` and `closedAt`
 *   set to the close instant while `createdAt` and `openedAt` are preserved;
 *   the returned DTO has `canReceiveDecisions === false`.
 *
 * The read + write run inside `repo.transaction` and the session id is never
 * reassigned, so future decisions stay attached to the same session.
 */
export function closeSession(
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

    if (record.status !== "open") {
      throw new SessionNotActiveError();
    }

    const nowIso = deps.clock.now().toISOString();
    const updated = {
      ...record,
      status: "closed" as const,
      updatedAt: nowIso,
      closedAt: nowIso,
    };
    store.update(updated);
    return toSession(updated);
  });
}
