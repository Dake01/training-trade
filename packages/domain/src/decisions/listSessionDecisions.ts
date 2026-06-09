import type { Decision } from "@training-trade/shared";
import { SessionNotFoundError } from "../sessions/errors";
import { compareDecisions, toDecision } from "./mappers";
import type { DecisionRepository } from "./types";

/**
 * List a session's decision history (AC 2).
 *
 * Business rules enforced here:
 * - the session must exist, otherwise {@link SessionNotFoundError} (a closed
 *   session keeps its decisions and stays consultable);
 * - decisions are returned in a stable order: `logicalTimestamp ASC,
 *   createdAt ASC, id ASC`.
 */
export function listSessionDecisions(
  repo: DecisionRepository,
  sessionId: string,
): Decision[] {
  return repo.transaction((store) => {
    const session = store.findSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }

    return store
      .listBySessionId(sessionId)
      .map(toDecision)
      .sort(compareDecisions);
  });
}
