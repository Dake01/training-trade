import type { Decision } from "@training-trade/shared";
import type { SessionDeps } from "../../sessions/types";
import { applyAmendments } from "./mappers";
import { loadAmendable } from "./loadAmendable";
import type {
  CancelDecisionInput,
  DecisionAmendmentRecord,
  DecisionAmendmentRepository,
} from "./types";

/**
 * Cancel (neutralise) an existing decision (AC 2).
 *
 * The cancellation is recorded as a new append-only amendment; the history is
 * left intact and the decision is marked `cancelled` so future statistics
 * (epic 2) can skip it without any destructive deletion. A cancellation is
 * terminal — {@link loadAmendable} refuses amending an already-cancelled
 * decision. Returns the recomputed effective decision.
 */
export function cancelDecision(
  repo: DecisionAmendmentRepository,
  deps: SessionDeps,
  sessionId: string,
  decisionId: string,
  input: CancelDecisionInput = {},
): Decision {
  return repo.transaction((store) => {
    const { decision, existing } = loadAmendable(store, sessionId, decisionId);

    const record: DecisionAmendmentRecord = {
      id: deps.ids.generate(),
      decisionId,
      sessionId,
      kind: "cancellation",
      comment: null,
      reason: input.reason ?? null,
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
