import type {
  DecisionAmendmentKind,
  DecisionCorrectionReplacement,
  DecisionSide,
} from "@training-trade/shared";
import type { SessionAssetRecord } from "../../sessions/assetTypes";
import type { SessionRecord } from "../../sessions/types";
import type { DecisionRecord } from "../types";

/**
 * Internal, persistence-facing amendment entity (camelCase). Append-only: each
 * comment, correction or cancellation is one record linked to the root
 * `decisionId`, so the decision row is never mutated and the trail stays
 * auditable. `comment` is set for a comment, `reason` for a
 * correction/cancellation, and the `replacement*` fields for a correction.
 * Monetary/quantity values stay exact decimal strings.
 */
export interface DecisionAmendmentRecord {
  id: string;
  decisionId: string;
  sessionId: string;
  kind: DecisionAmendmentKind;
  comment: string | null;
  reason: string | null;
  replacementAssetId: string | null;
  replacementSide: DecisionSide | null;
  replacementQuantity: string | null;
  replacementReferencePrice: string | null;
  replacementLogicalTimestamp: string | null;
  /** ISO 8601 audit instant the amendment was recorded. */
  createdAt: string;
}

/** Domain input for adding a short comment to a decision. */
export interface AddDecisionCommentInput {
  comment: string;
}

/** Domain input for correcting a decision (explicit, full restatement). */
export interface CorrectDecisionInput {
  reason?: string;
  replacement: DecisionCorrectionReplacement;
}

/** Domain input for cancelling (neutralising) a decision. */
export interface CancelDecisionInput {
  reason?: string;
}

/**
 * Transactional view handed to amendment operations. It exposes the session,
 * the root decision, the session<->asset links (to validate a correction's
 * replacement asset) and the append/read of amendments, so the rules and the
 * write run atomically.
 */
export interface DecisionAmendmentStore {
  /** Read a session (any status) so the rules can check existence + status. */
  findSession(sessionId: string): SessionRecord | null;
  /** Read the root decision so the rules can check existence + ownership. */
  findDecision(decisionId: string): DecisionRecord | null;
  /** Find the session<->asset link (used to validate a correction's asset). */
  findLink(sessionId: string, assetId: string): SessionAssetRecord | null;
  /** Append an amendment event. Never deduplicates. */
  insertAmendment(record: DecisionAmendmentRecord): DecisionAmendmentRecord;
  /** All amendments of one decision (order applied by the domain). */
  listByDecisionId(decisionId: string): DecisionAmendmentRecord[];
  /** All decisions of a session (order applied by the domain). */
  listDecisionsBySessionId(sessionId: string): DecisionRecord[];
  /** All amendments of a session (order applied by the domain). */
  listAmendmentsBySessionId(sessionId: string): DecisionAmendmentRecord[];
}

/**
 * Repository port for decision amendments. Implemented by packages/db (SQLite)
 * in production and by an in-memory fake in unit tests. `transaction` gives the
 * check + append sequence exclusive, atomic access.
 */
export interface DecisionAmendmentRepository {
  __client?: unknown;
  transaction<T>(fn: (store: DecisionAmendmentStore) => T): T;
}
