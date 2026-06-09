import type { Decision } from "@training-trade/shared";
import type { SessionDeps } from "../../sessions/types";
import { applyAmendments } from "./mappers";
import { loadAmendable } from "./loadAmendable";
import type {
  AddDecisionCommentInput,
  DecisionAmendmentRecord,
  DecisionAmendmentRepository,
} from "./types";

/**
 * Add a short comment to an existing decision (AC 1).
 *
 * Append-only: the comment is recorded as a new amendment event linked to the
 * decision; the decision row is never mutated. Preconditions (session open,
 * decision exists + belongs to the session, decision not cancelled) are
 * enforced by {@link loadAmendable}. Returns the recomputed effective decision
 * so the caller sees the latest comment immediately.
 */
export function addDecisionComment(
  repo: DecisionAmendmentRepository,
  deps: SessionDeps,
  sessionId: string,
  decisionId: string,
  input: AddDecisionCommentInput,
): Decision {
  return repo.transaction((store) => {
    const { decision, existing } = loadAmendable(store, sessionId, decisionId);

    const record: DecisionAmendmentRecord = {
      id: deps.ids.generate(),
      decisionId,
      sessionId,
      kind: "comment",
      comment: input.comment,
      reason: null,
      replacementAssetId: null,
      replacementSide: null,
      replacementQuantity: null,
      replacementReferencePrice: null,
      replacementLogicalTimestamp: null,
      createdAt: deps.clock.now().toISOString(),
    };

    const inserted = store.insertAmendment(record);
    return applyAmendments(decision, [...existing, inserted]);
  });
}
