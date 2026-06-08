import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema/sessions";

/**
 * Default local SQLite path for development. SQLite is the V1 source of truth
 * (see architecture: Data Boundaries). Override with the `DATABASE_URL`
 * environment variable.
 */
export const DEFAULT_DEV_DATABASE_PATH = ".data/training-trade.sqlite";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export interface DbClient {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
  close(): void;
}

/** Resolve the configured database path, accepting an optional `file:` prefix. */
export function resolveDatabasePath(
  raw: string | undefined = process.env.DATABASE_URL,
): string {
  const value = raw && raw.trim().length > 0 ? raw.trim() : DEFAULT_DEV_DATABASE_PATH;
  const path = value.startsWith("file:") ? value.slice("file:".length) : value;
  return path === ":memory:" || isAbsolute(path) ? path : resolve(REPO_ROOT, path);
}

/** Create the schema if it does not exist yet (V1 lightweight migration). */
export function ensureSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      opened_at TEXT NOT NULL,
      closed_at TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_session
      ON sessions (status) WHERE status = 'open';
  `);
}

/** Open a SQLite-backed Drizzle client and ensure the schema exists. */
export function createDbClient(path: string = resolveDatabasePath()): DbClient {
  if (path !== ":memory:") {
    const dir = dirname(path);
    if (dir && dir !== "." && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  ensureSchema(sqlite);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db, close: () => sqlite.close() };
}
