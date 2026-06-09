import type { Decision } from "@training-trade/shared";
import type { DecisionRecord } from "./types";

/**
 * Map an internal decision record to the public camelCase DTO. A bare decision
 * carries no amendment yet, so it is always emitted as `original` with no
 * comment; `applyAmendments` (story 1.5) overlays the effective state.
 */
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
    comment: null,
    revisionStatus: "original",
  };
}

/**
 * Compare two ISO 8601 instants by their absolute point in time, not by their
 * raw string. Comparing the strings directly would misorder timestamps written
 * in different time zones (e.g. `...T10:00:00+02:00` vs `...T09:00:00Z` are the
 * same instant); parsing to epoch milliseconds avoids that. An unparseable
 * value sorts last so a malformed row never silently jumps the queue.
 */
export function compareInstants(a: string, b: string): number {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
  if (Number.isNaN(ta)) return 1;
  if (Number.isNaN(tb)) return -1;
  return ta - tb;
}

/**
 * Stable, explicit ordering for a session's decision history:
 * `logicalTimestamp ASC, createdAt ASC, id ASC`. The logical timestamp drives
 * replay order; createdAt then id break ties deterministically. Timestamps are
 * compared as instants so mixed time zones order correctly.
 */
export function compareDecisions(a: Decision, b: Decision): number {
  return (
    compareInstants(a.logicalTimestamp, b.logicalTimestamp) ||
    compareInstants(a.createdAt, b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
