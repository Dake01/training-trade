import type { DecisionSide } from "@training-trade/shared";
import type { SessionAssetRecord } from "../sessions/assetTypes";
import type { SessionRecord } from "../sessions/types";

/**
 * Internal, persistence-facing decision entity (camelCase). The DB layer maps
 * this to/from snake_case columns; the API layer maps it to the public DTO.
 * `quantity` and `referencePrice` stay as exact decimal strings so floating
 * point is never the source of truth. `logicalTimestamp` orders decisions
 * within a session and is distinct from the `createdAt` audit instant.
 */
export interface DecisionRecord {
  id: string;
  sessionId: string;
  assetId: string;
  side: DecisionSide;
  quantity: string;
  referencePrice: string;
  /** ISO 8601 session-relative ordering instant. */
  logicalTimestamp: string;
  /** ISO 8601 audit instant the decision was recorded. */
  createdAt: string;
}

/** Domain input for capturing a decision; shape/validation lives in shared. */
export interface CaptureDecisionInput {
  assetId: string;
  side: DecisionSide;
  quantity: string;
  referencePrice: string;
  /** Optional: when omitted the capture instant is used for ordering. */
  logicalTimestamp?: string;
}

/**
 * Transactional view handed to decision operations. It exposes just enough of
 * the sessions, links and decisions tables to enforce the capture rules
 * atomically: the session must be open and the asset must already be linked.
 */
export interface DecisionStore {
  /** Read a session (any status) so the rules can check existence + status. */
  findSession(sessionId: string): SessionRecord | null;
  /** Find the session<->asset link, proving the asset belongs to the session. */
  findLink(sessionId: string, assetId: string): SessionAssetRecord | null;
  /** Append a decision event. Never deduplicates: each call is a new event. */
  insertDecision(record: DecisionRecord): DecisionRecord;
  /** All decisions of a session (order applied by the domain, not here). */
  listBySessionId(sessionId: string): DecisionRecord[];
}

/**
 * Repository port for decision capture. Implemented by packages/db (SQLite) in
 * production and by an in-memory fake in unit tests. `transaction` gives the
 * session + link check + insert sequence exclusive, atomic access.
 */
export interface DecisionRepository {
  __client?: unknown;
  transaction<T>(fn: (store: DecisionStore) => T): T;
}
