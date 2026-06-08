import { eq } from "drizzle-orm";
import type {
  SessionRecord,
  SessionRepository,
  SessionStore,
} from "@training-trade/domain";
import type { SessionStatus } from "@training-trade/shared";
import type { DbClient } from "../client";
import { sessions, type SessionRow } from "../schema/sessions";

/** Map a snake_case-backed Drizzle row to the camelCase domain record. */
function toRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    status: row.status as SessionStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    openedAt: row.openedAt,
    closedAt: row.closedAt ?? null,
  };
}

/**
 * SQLite implementation of the domain {@link SessionRepository}. The
 * `transaction` method uses a synchronous better-sqlite3 transaction so the
 * find-active + insert sequence in `createSession` is atomic.
 */
export function createSqliteSessionRepository(
  client: DbClient,
): SessionRepository {
  const { db, sqlite } = client;

  const findActive = (): SessionRecord | null => {
    const row = db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "open"))
      .limit(1)
      .all()[0];
    return row ? toRecord(row) : null;
  };

  const findById = (id: string): SessionRecord | null => {
    const row = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)
      .all()[0];
    return row ? toRecord(row) : null;
  };

  const store: SessionStore = {
    findActive,
    findById,
    insert: (record) => {
      db.insert(sessions)
        .values({
          id: record.id,
          status: record.status,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          openedAt: record.openedAt,
          closedAt: record.closedAt,
        })
        .run();
    },
    update: (record) => {
      // `id` and `createdAt` are immutable; only the mutable transition fields
      // are written so a session row is updated in place, never recreated.
      db.update(sessions)
        .set({
          status: record.status,
          updatedAt: record.updatedAt,
          openedAt: record.openedAt,
          closedAt: record.closedAt,
        })
        .where(eq(sessions.id, record.id))
        .run();
    },
  };

  return {
    findActive,
    findById,
    transaction: <T>(fn: (store: SessionStore) => T): T => {
      const runner = sqlite.transaction(() => fn(store));
      return runner() as T;
    },
  };
}
