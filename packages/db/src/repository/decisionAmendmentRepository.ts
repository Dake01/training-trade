import { and, asc, eq } from "drizzle-orm";
import type {
  DecisionAmendmentRecord,
  DecisionAmendmentRepository,
  DecisionAmendmentStore,
  DecisionRecord,
  SessionAssetRecord,
  SessionRecord,
} from "@training-trade/domain";
import {
  decisionAmendmentKindSchema,
  decisionSideSchema,
  sessionStatusSchema,
} from "@training-trade/shared";
import type { DbClient } from "../client";
import { runInTransaction } from "../client";
import { sessions, type SessionRow } from "../schema/sessions";
import { sessionAssets, type SessionAssetRow } from "../schema/assets";
import { decisions, type DecisionRow } from "../schema/decisions";
import {
  decisionAmendments,
  type DecisionAmendmentRow,
} from "../schema/decisionAmendments";

function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    status: sessionStatusSchema.parse(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    openedAt: row.openedAt,
    closedAt: row.closedAt ?? null,
  };
}

function toLinkRecord(row: SessionAssetRow): SessionAssetRecord {
  return {
    sessionId: row.sessionId,
    assetId: row.assetId,
    linkedAt: row.linkedAt,
  };
}

function toDecisionRecord(row: DecisionRow): DecisionRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    assetId: row.assetId,
    side: decisionSideSchema.parse(row.side),
    quantity: row.quantity,
    referencePrice: row.referencePrice,
    logicalTimestamp: row.logicalTimestamp,
    createdAt: row.createdAt,
  };
}

function toAmendmentRecord(row: DecisionAmendmentRow): DecisionAmendmentRecord {
  return {
    id: row.id,
    decisionId: row.decisionId,
    sessionId: row.sessionId,
    kind: decisionAmendmentKindSchema.parse(row.kind),
    comment: row.comment ?? null,
    reason: row.reason ?? null,
    replacementAssetId: row.replacementAssetId ?? null,
    replacementSide:
      row.replacementSide !== null
        ? decisionSideSchema.parse(row.replacementSide)
        : null,
    replacementQuantity: row.replacementQuantity ?? null,
    replacementReferencePrice: row.replacementReferencePrice ?? null,
    replacementLogicalTimestamp: row.replacementLogicalTimestamp ?? null,
    createdAt: row.createdAt,
  };
}

/**
 * SQLite implementation of the domain {@link DecisionAmendmentRepository}. The
 * `transaction` method wraps the precondition checks and the append in a
 * synchronous better-sqlite3 transaction so each amendment is atomic. The DB
 * layer keeps the snake_case <-> camelCase boundary; the domain stays
 * storage-agnostic. Decimal values are persisted verbatim as TEXT.
 */
export function createSqliteDecisionAmendmentRepository(
  client: DbClient,
): DecisionAmendmentRepository {
  const { db, sqlite } = client;

  const store: DecisionAmendmentStore = {
    findSession: (sessionId) => {
      const row = db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
        .all()[0];
      return row ? toSessionRecord(row) : null;
    },
    findDecision: (decisionId) => {
      const row = db
        .select()
        .from(decisions)
        .where(eq(decisions.id, decisionId))
        .limit(1)
        .all()[0];
      return row ? toDecisionRecord(row) : null;
    },
    findLink: (sessionId, assetId) => {
      const row = db
        .select()
        .from(sessionAssets)
        .where(
          and(
            eq(sessionAssets.sessionId, sessionId),
            eq(sessionAssets.assetId, assetId),
          ),
        )
        .limit(1)
        .all()[0];
      return row ? toLinkRecord(row) : null;
    },
    insertAmendment: (record) => {
      sqlite
        .prepare(
          `INSERT INTO decision_amendments
             (id, decision_id, session_id, kind, comment, reason,
              replacement_asset_id, replacement_side, replacement_quantity,
              replacement_reference_price, replacement_logical_timestamp, created_at)
           VALUES
             (@id, @decisionId, @sessionId, @kind, @comment, @reason,
              @replacementAssetId, @replacementSide, @replacementQuantity,
              @replacementReferencePrice, @replacementLogicalTimestamp, @createdAt)`,
        )
        .run(record);

      const row = db
        .select()
        .from(decisionAmendments)
        .where(eq(decisionAmendments.id, record.id))
        .limit(1)
        .all()[0];
      if (!row) {
        throw new Error(`Failed to persist amendment ${record.id}`);
      }
      return toAmendmentRecord(row);
    },
    listByDecisionId: (decisionId) =>
      db
        .select()
        .from(decisionAmendments)
        .where(eq(decisionAmendments.decisionId, decisionId))
        .orderBy(
          asc(decisionAmendments.createdAt),
          asc(decisionAmendments.id),
        )
        .all()
        .map(toAmendmentRecord),
    listDecisionsBySessionId: (sessionId) =>
      db
        .select()
        .from(decisions)
        .where(eq(decisions.sessionId, sessionId))
        .orderBy(
          asc(decisions.logicalTimestamp),
          asc(decisions.createdAt),
          asc(decisions.id),
        )
        .all()
        .map(toDecisionRecord),
    listAmendmentsBySessionId: (sessionId) =>
      db
        .select()
        .from(decisionAmendments)
        .where(eq(decisionAmendments.sessionId, sessionId))
        .orderBy(
          asc(decisionAmendments.createdAt),
          asc(decisionAmendments.id),
        )
        .all()
        .map(toAmendmentRecord),
  };

  return {
    __client: client,
    transaction: <T>(fn: (store: DecisionAmendmentStore) => T): T => {
      return runInTransaction(client, () => fn(store));
    },
  };
}
