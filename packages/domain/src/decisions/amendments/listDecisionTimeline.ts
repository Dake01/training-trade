import type { Decision, DecisionTimelineEntry } from "@training-trade/shared";
import { SessionNotFoundError } from "../../sessions/errors";
import { buildDecisionTimeline } from "./mappers";
import type { DecisionAmendmentRepository } from "./types";

/**
 * List a session's decision timeline (AC 1, 2, 3): each root decision in its
 * effective state, paired with its ordered, auditable amendment trail.
 *
 * The session must exist ({@link SessionNotFoundError}); a closed session keeps
 * its decisions and amendments and stays consultable in read-only. Entries are
 * returned in the stable replay order so the display stays coherent across
 * repeated edits.
 */
export function listDecisionTimeline(
  repo: DecisionAmendmentRepository,
  sessionId: string,
): DecisionTimelineEntry[] {
  return repo.transaction((store) => {
    const session = store.findSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }

    return buildDecisionTimeline(
      store.listDecisionsBySessionId(sessionId),
      store.listAmendmentsBySessionId(sessionId),
    );
  });
}

/**
 * Convenience view over {@link listDecisionTimeline}: the session's decisions in
 * their effective state (latest comment + applied correction/cancellation),
 * stable order. Backs `GET /api/sessions/[id]/decisions`.
 */
export function listSessionEffectiveDecisions(
  repo: DecisionAmendmentRepository,
  sessionId: string,
): Decision[] {
  return listDecisionTimeline(repo, sessionId).map((entry) => entry.decision);
}
