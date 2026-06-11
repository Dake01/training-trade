import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

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

const transactionDepth = new WeakMap<Database.Database, number>();

/**
 * Run a function inside a SQLite transaction, but reuse the current transaction
 * when the caller is already inside one. This lets the API layer compose
 * session + portfolio + amendment writes atomically without nested BEGIN calls.
 */
export function runInTransaction<T>(client: DbClient, fn: () => T): T {
  const depth = transactionDepth.get(client.sqlite) ?? 0;
  if (depth > 0) {
    transactionDepth.set(client.sqlite, depth + 1);
    try {
      return fn();
    } finally {
      transactionDepth.set(client.sqlite, depth);
    }
  }

  transactionDepth.set(client.sqlite, 1);
  try {
    const runner = client.sqlite.transaction(fn);
    return runner() as T;
  } finally {
    transactionDepth.delete(client.sqlite);
  }
}

/** Resolve the configured database path, accepting an optional `file:` prefix. */
export function resolveDatabasePath(
  raw: string | undefined = process.env.DATABASE_URL,
): string {
  const value = raw && raw.trim().length > 0 ? raw.trim() : DEFAULT_DEV_DATABASE_PATH;
  const path = value.startsWith("file:") ? value.slice("file:".length) : value;
  return path === ":memory:" || isAbsolute(path) ? path : resolve(REPO_ROOT, path);
}

function hasColumn(
  sqlite: Database.Database,
  tableName: string,
  columnName: string,
): boolean {
  return sqlite
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((row) => (row as { name: string }).name === columnName);
}

function addColumnIfMissing(
  sqlite: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  if (!hasColumn(sqlite, tableName, columnName)) {
    sqlite.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
  }
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

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_asset_symbol
      ON assets (symbol);

    CREATE TABLE IF NOT EXISTS session_assets (
      session_id TEXT NOT NULL REFERENCES sessions (id),
      asset_id TEXT NOT NULL REFERENCES assets (id),
      linked_at TEXT NOT NULL,
      PRIMARY KEY (session_id, asset_id)
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions (id),
      asset_id TEXT NOT NULL REFERENCES assets (id),
      side TEXT NOT NULL,
      quantity TEXT NOT NULL,
      reference_price TEXT NOT NULL,
      logical_timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_decisions_session_order
      ON decisions (session_id, logical_timestamp, created_at, id);

    CREATE TABLE IF NOT EXISTS decision_amendments (
      id TEXT PRIMARY KEY,
      decision_id TEXT NOT NULL REFERENCES decisions (id),
      session_id TEXT NOT NULL REFERENCES sessions (id),
      kind TEXT NOT NULL,
      comment TEXT,
      reason TEXT,
      replacement_asset_id TEXT REFERENCES assets (id),
      replacement_side TEXT,
      replacement_quantity TEXT,
      replacement_reference_price TEXT,
      replacement_logical_timestamp TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_amendments_decision_order
      ON decision_amendments (decision_id, created_at, id);
    CREATE INDEX IF NOT EXISTS idx_amendments_session_order
      ON decision_amendments (session_id, created_at, id);

    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions (id),
      kind TEXT NOT NULL,
      cash TEXT NOT NULL,
      reference_currency TEXT NOT NULL,
      total_value TEXT NOT NULL,
      snapshot_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      decision_id TEXT
    );

    CREATE TABLE IF NOT EXISTS portfolio_positions (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL REFERENCES portfolio_snapshots (id),
      asset_id TEXT NOT NULL REFERENCES assets (id),
      quantity TEXT NOT NULL,
      average_price TEXT NOT NULL,
      last_price TEXT NOT NULL,
      market_value TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_portfolio_positions_snapshot
      ON portfolio_positions (snapshot_id);
    CREATE INDEX IF NOT EXISTS idx_portfolio_positions_asset
      ON portfolio_positions (asset_id);
  `);

  // Lightweight migration for local DBs created before portfolio history.
  // CREATE TABLE IF NOT EXISTS does not add columns to existing tables, so add
  // the columns required by story 2.2/2.3 before creating dependent indexes.
  addColumnIfMissing(sqlite, "portfolio_snapshots", "kind", "kind TEXT NOT NULL DEFAULT 'bootstrap'");
  addColumnIfMissing(sqlite, "portfolio_snapshots", "snapshot_index", "snapshot_index INTEGER NOT NULL DEFAULT 0");
  addColumnIfMissing(sqlite, "portfolio_snapshots", "decision_id", "decision_id TEXT");

  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_portfolio_bootstrap
      ON portfolio_snapshots (session_id) WHERE kind = 'bootstrap';
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_portfolio_snapshot_decision
      ON portfolio_snapshots (session_id, decision_id) WHERE decision_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_session_order
      ON portfolio_snapshots (session_id, snapshot_index);
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
