import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ActiveSessionExistsError,
  createSession,
  getActiveSession,
  systemSessionDeps,
} from "@training-trade/domain";
import { createDbClient, resolveDatabasePath, type DbClient } from "../../client";
import { createSqliteSessionRepository } from "../sessionRepository";

describe("createSqliteSessionRepository (integration, in-memory SQLite)", () => {
  let client: DbClient;

  beforeEach(() => {
    client = createDbClient(":memory:");
  });

  afterEach(() => {
    client.close();
  });

  it("inserts a session and reads it back as the active session", () => {
    const repo = createSqliteSessionRepository(client);

    const created = createSession(repo, systemSessionDeps);
    const active = getActiveSession(repo);

    expect(active).not.toBeNull();
    expect(active?.id).toBe(created.id);
    expect(active?.status).toBe("open");
    expect(active?.canReceiveDecisions).toBe(true);
  });

  it("stores columns in snake_case while exposing camelCase to the domain", () => {
    const repo = createSqliteSessionRepository(client);
    const created = createSession(repo, systemSessionDeps);

    const raw = client.sqlite
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get(created.id) as Record<string, unknown>;

    // DB row uses snake_case column names...
    expect(Object.keys(raw)).toEqual(
      expect.arrayContaining([
        "id",
        "status",
        "created_at",
        "updated_at",
        "opened_at",
        "closed_at",
      ]),
    );
    // ...while the repository returns camelCase records.
    expect(repo.findActive()).toMatchObject({
      id: created.id,
      createdAt: created.createdAt,
      openedAt: created.openedAt,
    });
  });

  it("persists ISO 8601 timestamps", () => {
    const repo = createSqliteSessionRepository(client);
    const created = createSession(repo, systemSessionDeps);

    const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    expect(created.createdAt).toMatch(iso);
    // Round-trips unchanged through SQLite.
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
  });

  it("refuses a second active session (domain error + DB unique index)", () => {
    const repo = createSqliteSessionRepository(client);
    createSession(repo, systemSessionDeps);

    expect(() => createSession(repo, systemSessionDeps)).toThrow(
      ActiveSessionExistsError,
    );

    const count = client.sqlite
      .prepare("SELECT COUNT(*) AS n FROM sessions WHERE status = 'open'")
      .get() as { n: number };
    expect(count.n).toBe(1);
  });

  it("resolves relative database paths from the repo root", () => {
    const fromRoot = resolveDatabasePath(".data/training-trade.sqlite");
    const cwd = process.cwd();

    try {
      process.chdir("apps/review");
      expect(resolveDatabasePath(".data/training-trade.sqlite")).toBe(fromRoot);
    } finally {
      process.chdir(cwd);
    }

    expect(fromRoot).toMatch(/training-trade\/.data\/training-trade\.sqlite$/);
  });

});
