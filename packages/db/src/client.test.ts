import { afterEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { ensureSchema } from "./client";

describe("ensureSchema lightweight migrations", () => {
  let sqlite: Database.Database | null = null;

  afterEach(() => {
    sqlite?.close();
    sqlite = null;
  });

  it("adds portfolio history columns before creating dependent indexes", () => {
    sqlite = new Database(":memory:");
    sqlite.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        closed_at TEXT
      );
      CREATE TABLE portfolio_snapshots (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions (id),
        cash TEXT NOT NULL,
        reference_currency TEXT NOT NULL,
        total_value TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    expect(() => ensureSchema(sqlite as Database.Database)).not.toThrow();

    const columns = (sqlite as Database.Database)
      .prepare("PRAGMA table_info(portfolio_snapshots)")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(columns).toContain("kind");
    expect(columns).toContain("snapshot_index");
    expect(columns).toContain("decision_id");

    const indexes = (sqlite as Database.Database)
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(indexes).toContain("uniq_portfolio_snapshot_decision");
    expect(indexes).toContain("idx_portfolio_snapshots_session_order");
  });
});
