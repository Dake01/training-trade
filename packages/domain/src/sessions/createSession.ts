import { CREATABLE_SESSION_STATUS } from "@training-trade/shared";
import type { Session } from "@training-trade/shared";
import { ActiveSessionExistsError } from "./errors";
import { toSession } from "./mappers";
import type { SessionDeps, SessionRecord, SessionRepository } from "./types";

/**
 * Create a new simulated trading session and open it immediately (AC 1 & 2).
 *
 * Business rules enforced here:
 * - a fresh unique id is generated;
 * - the session starts with status `open` and is opened at creation time;
 * - creation is refused with {@link ActiveSessionExistsError} if an active
 *   session already exists.
 *
 * The check + insert run inside `repo.transaction` so the single-active-session
 * invariant is atomic, not best-effort.
 */
export function createSession(
  repo: SessionRepository,
  deps: SessionDeps,
): Session {
  return repo.transaction((store) => {
    const active = store.findActive();
    if (active) {
      throw new ActiveSessionExistsError();
    }

    const nowIso = deps.clock.now().toISOString();
    const record: SessionRecord = {
      id: deps.ids.generate(),
      status: CREATABLE_SESSION_STATUS,
      createdAt: nowIso,
      updatedAt: nowIso,
      openedAt: nowIso,
      closedAt: null,
    };

    store.insert(record);
    return toSession(record);
  });
}
