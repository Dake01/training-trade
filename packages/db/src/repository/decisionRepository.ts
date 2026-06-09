import { and, asc, eq } from "drizzle-orm";
import type {
  DecisionRecord,
  DecisionRepository,
  DecisionStore,
  SessionAssetRecord,
  SessionRecord,
} from "@training-trade/domain";
import { decisionSideSchema, sessionStatusSchema } from "@training-trade/shared";
import type { DbClient } from "../client";
import { sessions, type SessionRow } from "../schema/sessions";
import { sessionAssets, type SessionAssetRow } from "../schema/assets";
import { decisions, type DecisionRow } from "../schema/decisions";

/** Map a session row to the validated camelCase domain record. */
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

/** Map a decision row to the validated camelCase domain record. */
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

/**
 * SQLite implementation of the domain {@link DecisionRepository}. The
 * `transaction` method wraps the session + link check and the append in a
 * synchronous better-sqlite3 transaction so capture is atomic. The DB layer
 * keeps the snake_case <-> camelCase boundary; the domain stays
 * storage-agnostic. Decimal money/quantity values are persisted verbatim as
 * TEXT so the exact value round-trips.
 */
export function createSqliteDecisionRepository(
  client: DbClient,
): DecisionRepository {
  const { db, sqlite } = client;

  const store: DecisionStore = {
    findSession: (sessionId) => {
      const row = db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
        .all()[0];
      return row ? toSessionRecord(row) : null;
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
    insertDecision: (record) => {
      sqlite
        .prepare(
          `INSERT INTO decisions
             (id, session_id, asset_id, side, quantity, reference_price, logical_timestamp, created_at)
           VALUES
             (@id, @sessionId, @assetId, @side, @quantity, @referencePrice, @logicalTimestamp, @createdAt)`,
        )
        .run(record);

      const row = db
        .select()
        .from(decisions)
        .where(eq(decisions.id, record.id))
        .limit(1)
        .all()[0];
      if (!row) {
        throw new Error(`Failed to persist decision ${record.id}`);
      }
      return toDecisionRecord(row);
    },
    listBySessionId: (sessionId) => {
      const rows = db
        .select()
        .from(decisions)
        .where(eq(decisions.sessionId, sessionId))
        .orderBy(
          asc(decisions.logicalTimestamp),
          asc(decisions.createdAt),
          asc(decisions.id),
        )
        .all();
      return rows.map(toDecisionRecord);
    },
  };

  return {
    transaction: <T>(fn: (store: DecisionStore) => T): T => {
      const runner = sqlite.transaction(() => fn(store));
      return runner() as T;
    },
  };
}
