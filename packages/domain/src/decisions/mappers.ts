import type { Decision } from "@training-trade/shared";
import type { DecisionRecord } from "./types";

/** Map an internal decision record to the public camelCase DTO. */
export function toDecision(record: DecisionRecord): Decision {
  return {
    id: record.id,
    sessionId: record.sessionId,
    assetId: record.assetId,
    side: record.side,
    quantity: record.quantity,
    referencePrice: record.referencePrice,
    logicalTimestamp: record.logicalTimestamp,
    createdAt: record.createdAt,
  };
}

/**
 * Stable, explicit ordering for a session's decision history:
 * `logicalTimestamp ASC, createdAt ASC, id ASC`. The logical timestamp drives
 * replay order; createdAt then id break ties deterministically.
 */
export function compareDecisions(a: Decision, b: Decision): number {
  return (
    a.logicalTimestamp.localeCompare(b.logicalTimestamp) ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
