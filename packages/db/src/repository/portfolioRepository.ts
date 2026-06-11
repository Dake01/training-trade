import { and, eq } from "drizzle-orm";
import type {
  PortfolioPositionRecord,
  PortfolioRepository,
  PortfolioSnapshotRecord,
  PortfolioStore,
} from "@training-trade/domain";
import { sessionStatusSchema } from "@training-trade/shared";
import type { SessionRecord } from "@training-trade/domain";
import type { DbClient } from "../client";
import { runInTransaction } from "../client";
import { portfolioPositions, type PortfolioPositionRow } from "../schema/portfolioPositions";
import { portfolioSnapshots, type PortfolioSnapshotRow } from "../schema/portfolio";
import { sessions } from "../schema/sessions";

function toSnapshotRecord(row: PortfolioSnapshotRow): PortfolioSnapshotRecord {
  return {
    id: row.id,
    sessionId: row.sessionId,
    kind: row.kind,
    cash: row.cash,
    referenceCurrency: row.referenceCurrency,
    totalValue: row.totalValue,
    snapshotIndex: row.snapshotIndex,
    createdAt: row.createdAt,
    decisionId: row.decisionId ?? null,
  };
}

function toPositionRecord(row: PortfolioPositionRow): PortfolioPositionRecord {
  return {
    id: row.id,
    snapshotId: row.snapshotId,
    assetId: row.assetId,
    quantity: row.quantity,
    averagePrice: row.averagePrice,
    lastPrice: row.lastPrice,
    marketValue: row.marketValue,
    createdAt: row.createdAt,
  };
}

/**
 * SQLite implementation of the domain {@link PortfolioRepository}.
 * Uses synchronous better-sqlite3 transactions for atomic operations.
 */
export function createSqlitePortfolioRepository(
  client: DbClient,
): PortfolioRepository {
  const { db, sqlite } = client;

  const findBootstrap = (sessionId: string): PortfolioSnapshotRecord | null => {
    const row = db
      .select()
      .from(portfolioSnapshots)
      .where(
        and(
          eq(portfolioSnapshots.sessionId, sessionId),
          eq(portfolioSnapshots.kind, "bootstrap"),
        ),
      )
      .limit(1)
      .all()[0];
    return row ? toSnapshotRecord(row) : null;
  };

  const store: PortfolioStore = {
    findSession: (sessionId): SessionRecord | null => {
      const row = db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
        .all()[0];
      if (!row) return null;
      return {
        id: row.id,
        status: sessionStatusSchema.parse(row.status),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        openedAt: row.openedAt,
        closedAt: row.closedAt ?? null,
      };
    },

    findBootstrap,

    insertBootstrap: (record) => {
      db.insert(portfolioSnapshots)
        .values({
          id: record.id,
          sessionId: record.sessionId,
          kind: record.kind,
          cash: record.cash,
          referenceCurrency: record.referenceCurrency,
          totalValue: record.totalValue,
          snapshotIndex: record.snapshotIndex,
          createdAt: record.createdAt,
          decisionId: record.decisionId,
        })
        .run();
    },

    findLatestSnapshot: (sessionId): PortfolioSnapshotRecord | null => {
      const row = db
        .select()
        .from(portfolioSnapshots)
        .where(eq(portfolioSnapshots.sessionId, sessionId))
        .orderBy(portfolioSnapshots.snapshotIndex)
        .all()
        .at(-1);
      return row ? toSnapshotRecord(row) : null;
    },

    findAllSnapshots: (sessionId): PortfolioSnapshotRecord[] => {
      return db
        .select()
        .from(portfolioSnapshots)
        .where(eq(portfolioSnapshots.sessionId, sessionId))
        .orderBy(portfolioSnapshots.snapshotIndex)
        .all()
        .map(toSnapshotRecord);
    },

    findPositionsBySnapshot: (snapshotId): PortfolioPositionRecord[] => {
      return db
        .select()
        .from(portfolioPositions)
        .where(eq(portfolioPositions.snapshotId, snapshotId))
        .all()
        .map(toPositionRecord);
    },

    findSnapshotByDecision: (sessionId, decisionId): PortfolioSnapshotRecord | null => {
      const row = db
        .select()
        .from(portfolioSnapshots)
        .where(
          and(
            eq(portfolioSnapshots.sessionId, sessionId),
            eq(portfolioSnapshots.decisionId, decisionId),
          ),
        )
        .limit(1)
        .all()[0];
      return row ? toSnapshotRecord(row) : null;
    },

    appendSnapshot: (snapshot, positions) => {
      db.insert(portfolioSnapshots)
        .values({
          id: snapshot.id,
          sessionId: snapshot.sessionId,
          kind: snapshot.kind,
          cash: snapshot.cash,
          referenceCurrency: snapshot.referenceCurrency,
          totalValue: snapshot.totalValue,
          snapshotIndex: snapshot.snapshotIndex,
          createdAt: snapshot.createdAt,
          decisionId: snapshot.decisionId,
        })
        .run();

      if (positions.length > 0) {
        db.insert(portfolioPositions)
          .values(
            positions.map((pos) => ({
              id: pos.id,
              snapshotId: pos.snapshotId,
              assetId: pos.assetId,
              quantity: pos.quantity,
              averagePrice: pos.averagePrice,
              lastPrice: pos.lastPrice,
              marketValue: pos.marketValue,
              createdAt: pos.createdAt,
            })),
          )
          .run();
      }
    },

    deleteDecisionSnapshots: (sessionId) => {
      // Delete positions of decision snapshots first (FK constraint).
      const decisionSnapshotIds = db
        .select({ id: portfolioSnapshots.id })
        .from(portfolioSnapshots)
        .where(
          and(
            eq(portfolioSnapshots.sessionId, sessionId),
            eq(portfolioSnapshots.kind, "decision"),
          ),
        )
        .all()
        .map((row) => row.id);

      for (const snapshotId of decisionSnapshotIds) {
        db.delete(portfolioPositions)
          .where(eq(portfolioPositions.snapshotId, snapshotId))
          .run();
      }

      db.delete(portfolioSnapshots)
        .where(
          and(
            eq(portfolioSnapshots.sessionId, sessionId),
            eq(portfolioSnapshots.kind, "decision"),
          ),
        )
        .run();
    },
  };

  return {
    __client: client,
    findBootstrap,
    transaction: <T>(fn: (store: PortfolioStore) => T): T => {
      return runInTransaction(client, () => fn(store));
    },
  };
}
