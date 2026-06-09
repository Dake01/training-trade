import type { Decision } from "@training-trade/shared";
import type { SessionDeps } from "../../sessions/types";
import { AssetNotInSessionError } from "../errors";
import { applyAmendments } from "./mappers";
import { loadAmendable } from "./loadAmendable";
import type {
  CorrectDecisionInput,
  DecisionAmendmentRecord,
  DecisionAmendmentRepository,
} from "./types";

/**
 * Correct an existing decision with an explicit, full restatement (AC 2).
 *
 * The correction is recorded as a new append-only amendment carrying the
 * replacement business fields; the original decision row stays intact and
 * traceable. The effective decision reflects the corrected values and a
 * `corrected` revision status. Preconditions are enforced by
 * {@link loadAmendable}; additionally the replacement asset must already be
 * linked to the session (story 1.3 rule), otherwise
 * {@link AssetNotInSessionError}.
 */
export function correctDecision(
  repo: DecisionAmendmentRepository,
  deps: SessionDeps,
  sessionId: string,
  decisionId: string,
  input: CorrectDecisionInput,
): Decision {
  return repo.transaction((store) => {
    const { decision, existing } = loadAmendable(store, sessionId, decisionId);

    const { replacement } = input;
    if (!store.findLink(sessionId, replacement.assetId)) {
      throw new AssetNotInSessionError();
    }

    const record: DecisionAmendmentRecord = {
      id: deps.ids.generate(),
      decisionId,
      sessionId,
      kind: "correction",
      comment: null,
      reason: input.reason ?? null,
      replacementAssetId: replacement.assetId,
      replacementSide: replacement.side,
      replacementQuantity: replacement.quantity,
      replacementReferencePrice: replacement.referencePrice,
      replacementLogicalTimestamp: replacement.logicalTimestamp ?? null,
      createdAt: deps.clock.now().toISOString(),
    };

    const inserted = store.insertAmendment(record);
    return applyAmendments(decision, [...existing, inserted]);
  });
}
