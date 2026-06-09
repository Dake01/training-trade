import type {
  Decision,
  DecisionAmendment,
  DecisionSide,
  DecisionTimelineEntry,
} from "@training-trade/shared";
import { compareInstants, toDecision } from "../mappers";
import type { DecisionRecord } from "../types";
import type { DecisionAmendmentRecord } from "./types";

/** Map an internal amendment record to the public camelCase DTO. */
export function toDecisionAmendment(
  record: DecisionAmendmentRecord,
): DecisionAmendment {
  const hasReplacement =
    record.replacementAssetId !== null &&
    record.replacementSide !== null &&
    record.replacementQuantity !== null &&
    record.replacementReferencePrice !== null;

  return {
    id: record.id,
    decisionId: record.decisionId,
    sessionId: record.sessionId,
    kind: record.kind,
    comment: record.comment,
    reason: record.reason,
    replacement: hasReplacement
      ? {
          assetId: record.replacementAssetId as string,
          side: record.replacementSide as DecisionSide,
          quantity: record.replacementQuantity as string,
          referencePrice: record.replacementReferencePrice as string,
          ...(record.replacementLogicalTimestamp !== null
            ? { logicalTimestamp: record.replacementLogicalTimestamp }
            : {}),
        }
      : null,
    createdAt: record.createdAt,
  };
}

/**
 * Deterministic order for a decision's amendments: by audit instant
 * (`createdAt`) then `id`. The instant comparison is time-zone safe.
 */
export function compareAmendments(
  a: DecisionAmendmentRecord,
  b: DecisionAmendmentRecord,
): number {
  return compareInstants(a.createdAt, b.createdAt) || a.id.localeCompare(b.id);
}

/**
 * Fold a decision's append-only amendments into its effective DTO (story 1.5).
 * The root decision is never mutated; this computes the current readable state:
 * - the latest `comment` wins;
 * - each `correction` restates the business fields (asset, side, quantity,
 *   reference price, and the logical timestamp when provided);
 * - a `cancellation` is terminal and marks the decision `cancelled`.
 *
 * `revisionStatus` resolves to `cancelled` if any cancellation exists, else
 * `corrected` if any correction exists, else `original`.
 */
export function applyAmendments(
  decision: DecisionRecord,
  amendments: DecisionAmendmentRecord[],
): Decision {
  const ordered = [...amendments].sort(compareAmendments);
  const effective: Decision = toDecision(decision);

  let hasCorrection = false;
  let hasCancellation = false;

  for (const amendment of ordered) {
    switch (amendment.kind) {
      case "comment":
        if (amendment.comment !== null) {
          effective.comment = amendment.comment;
        }
        break;
      case "correction":
        hasCorrection = true;
        if (amendment.replacementAssetId !== null) {
          effective.assetId = amendment.replacementAssetId;
        }
        if (amendment.replacementSide !== null) {
          effective.side = amendment.replacementSide;
        }
        if (amendment.replacementQuantity !== null) {
          effective.quantity = amendment.replacementQuantity;
        }
        if (amendment.replacementReferencePrice !== null) {
          effective.referencePrice = amendment.replacementReferencePrice;
        }
        if (amendment.replacementLogicalTimestamp !== null) {
          effective.logicalTimestamp = amendment.replacementLogicalTimestamp;
        }
        break;
      case "cancellation":
        hasCancellation = true;
        break;
    }
  }

  effective.revisionStatus = hasCancellation
    ? "cancelled"
    : hasCorrection
      ? "corrected"
      : "original";

  return effective;
}

/**
 * Build a session's decision timeline: each root decision with its effective
 * state and its ordered amendment trail. Entries are ordered by the effective
 * decision's stable replay order (logical timestamp, then createdAt, then id).
 */
export function buildDecisionTimeline(
  decisions: DecisionRecord[],
  amendments: DecisionAmendmentRecord[],
): DecisionTimelineEntry[] {
  const byDecision = new Map<string, DecisionAmendmentRecord[]>();
  for (const amendment of amendments) {
    const bucket = byDecision.get(amendment.decisionId);
    if (bucket) {
      bucket.push(amendment);
    } else {
      byDecision.set(amendment.decisionId, [amendment]);
    }
  }

  return decisions
    .map((decision) => {
      const trail = (byDecision.get(decision.id) ?? []).sort(compareAmendments);
      return {
        decision: applyAmendments(decision, trail),
        amendments: trail.map(toDecisionAmendment),
      };
    })
    .sort((a, b) => {
      const da = a.decision;
      const db = b.decision;
      return (
        compareInstants(da.logicalTimestamp, db.logicalTimestamp) ||
        compareInstants(da.createdAt, db.createdAt) ||
        da.id.localeCompare(db.id)
      );
    });
}
