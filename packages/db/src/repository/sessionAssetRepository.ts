import { and, eq } from "drizzle-orm";
import type {
  AssetRecord,
  SessionAssetRecord,
  SessionAssetRepository,
  SessionAssetStore,
  SessionRecord,
} from "@training-trade/domain";
import { sessionStatusSchema } from "@training-trade/shared";
import type { DbClient } from "../client";
import { runInTransaction } from "../client";
import { sessions, type SessionRow } from "../schema/sessions";
import {
  assets,
  sessionAssets,
  type AssetRow,
  type SessionAssetRow,
} from "../schema/assets";

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

function toAssetRecord(row: AssetRow): AssetRecord {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name ?? null,
    createdAt: row.createdAt,
  };
}

function toLinkRecord(row: SessionAssetRow): SessionAssetRecord {
  return {
    sessionId: row.sessionId,
    assetId: row.assetId,
    linkedAt: row.linkedAt,
  };
}

/**
 * SQLite implementation of the domain {@link SessionAssetRepository}. The
 * `transaction` method wraps the find-or-create asset + link sequence in a
 * synchronous better-sqlite3 transaction so it is atomic. The DB layer keeps
 * the snake_case <-> camelCase boundary; the domain stays storage-agnostic.
 */
export function createSqliteSessionAssetRepository(
  client: DbClient,
): SessionAssetRepository {
  const { db, sqlite } = client;

  const store: SessionAssetStore = {
    findSession: (sessionId) => {
      const row = db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
        .all()[0];
      return row ? toSessionRecord(row) : null;
    },
    findAssetBySymbol: (symbol) => {
      const row = db
        .select()
        .from(assets)
        .where(eq(assets.symbol, symbol))
        .limit(1)
        .all()[0];
      return row ? toAssetRecord(row) : null;
    },
    insertAsset: (record) => {
      sqlite
        .prepare(
          `INSERT OR IGNORE INTO assets (id, symbol, name, created_at)
           VALUES (@id, @symbol, @name, @createdAt)`,
        )
        .run(record);

      const row = db
        .select()
        .from(assets)
        .where(eq(assets.symbol, record.symbol))
        .limit(1)
        .all()[0];
      if (!row) {
        throw new Error(`Failed to persist asset ${record.symbol}`);
      }
      return toAssetRecord(row);
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
    insertLink: (record) => {
      sqlite
        .prepare(
          `INSERT OR IGNORE INTO session_assets (session_id, asset_id, linked_at)
           VALUES (@sessionId, @assetId, @linkedAt)`,
        )
        .run(record);

      const row = db
        .select()
        .from(sessionAssets)
        .where(
          and(
            eq(sessionAssets.sessionId, record.sessionId),
            eq(sessionAssets.assetId, record.assetId),
          ),
        )
        .limit(1)
        .all()[0];
      if (!row) {
        throw new Error(
          `Failed to persist asset link ${record.sessionId}/${record.assetId}`,
        );
      }
      return toLinkRecord(row);
    },
    listLinks: (sessionId) => {
      const rows = db
        .select({
          id: assets.id,
          symbol: assets.symbol,
          name: assets.name,
          createdAt: assets.createdAt,
          sessionId: sessionAssets.sessionId,
          assetId: sessionAssets.assetId,
          linkedAt: sessionAssets.linkedAt,
        })
        .from(sessionAssets)
        .innerJoin(assets, eq(sessionAssets.assetId, assets.id))
        .where(eq(sessionAssets.sessionId, sessionId))
        .all();

      return rows.map((row) => ({
        asset: {
          id: row.id,
          symbol: row.symbol,
          name: row.name ?? null,
          createdAt: row.createdAt,
        },
        link: {
          sessionId: row.sessionId,
          assetId: row.assetId,
          linkedAt: row.linkedAt,
        },
      }));
    },
  };

  return {
    __client: client,
    transaction: <T>(fn: (store: SessionAssetStore) => T): T => {
      return runInTransaction(client, () => fn(store));
    },
  };
}
