import { SessionNotActiveError, SessionNotFoundError } from "../../sessions/errors";
import type { DecisionRecord } from "../types";
import { DecisionNotAmendableError, DecisionNotFoundError } from "./errors";
import type { DecisionAmendmentRecord, DecisionAmendmentStore } from "./types";

/**
 * Shared precondition check for every amendment (comment, correction,
 * cancellation). Enforces the explicit, stable rules:
 * - the session must exist ({@link SessionNotFoundError});
 * - the session must be `open` ({@link SessionNotActiveError}) — a closed
 *   session stays consultable but accepts no new amendment without an explicit
 *   reopen;
 * - the decision must exist AND belong to the target session
 *   ({@link DecisionNotFoundError});
 * - the decision must still be modifiable: a cancellation is terminal, so a
 *   cancelled decision is refused ({@link DecisionNotAmendableError}).
 *
 * Returns the root decision and its existing amendment trail so the caller can
 * append a new event and recompute the effective decision atomically.
 */
export function loadAmendable(
  store: DecisionAmendmentStore,
  sessionId: string,
  decisionId: string,
): { decision: DecisionRecord; existing: DecisionAmendmentRecord[] } {
  const session = store.findSession(sessionId);
  if (!session) {
    throw new SessionNotFoundError();
  }
  if (session.status !== "open") {
    throw new SessionNotActiveError();
  }

  const decision = store.findDecision(decisionId);
  if (!decision || decision.sessionId !== sessionId) {
    throw new DecisionNotFoundError();
  }

  const existing = store.listByDecisionId(decisionId);
  if (existing.some((amendment) => amendment.kind === "cancellation")) {
    throw new DecisionNotAmendableError();
  }

  return { decision, existing };
}
