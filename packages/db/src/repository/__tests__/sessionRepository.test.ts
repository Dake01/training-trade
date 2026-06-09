import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ActiveSessionExistsError,
  closeSession,
  createSession,
  getActiveSession,
  resumeSession,
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

  it("finds a persisted session by id and returns null for unknown ids", () => {
    const repo = createSqliteSessionRepository(client);
    const created = createSession(repo, systemSessionDeps);

    expect(repo.findById(created.id)?.id).toBe(created.id);
    expect(repo.findById("does-not-exist")).toBeNull();
  });

  it("rejects persisted rows with an unknown session status", () => {
    const repo = createSqliteSessionRepository(client);
    client.sqlite
      .prepare(
        `INSERT INTO sessions (id, status, created_at, updated_at, opened_at, closed_at)
         VALUES (?, 'archived', ?, ?, ?, NULL)`,
      )
      .run(
        "bad-status",
        "2026-06-08T10:00:00.000Z",
        "2026-06-08T10:00:00.000Z",
        "2026-06-08T10:00:00.000Z",
      );

    expect(() => repo.findById("bad-status")).toThrow();
  });

  it("closes a session: no active session remains and timestamps are preserved", () => {
    const repo = createSqliteSessionRepository(client);
    const created = createSession(repo, systemSessionDeps);

    const closed = closeSession(repo, systemSessionDeps, created.id);

    expect(closed.status).toBe("closed");
    expect(closed.canReceiveDecisions).toBe(false);
    expect(closed.closedAt).not.toBeNull();
    // createdAt/openedAt preserved across the update.
    expect(closed.createdAt).toBe(created.createdAt);
    expect(closed.openedAt).toBe(created.openedAt);
    // GET active is null after close, and the row still exists (update, not delete).
    expect(getActiveSession(repo)).toBeNull();
    expect(repo.findById(created.id)?.status).toBe("closed");
  });

  it("allows opening a new session after the previous one is closed", () => {
    const repo = createSqliteSessionRepository(client);
    const first = createSession(repo, systemSessionDeps);
    closeSession(repo, systemSessionDeps, first.id);

    // The partial unique index only constrains `open` rows, so a new one is allowed.
    const second = createSession(repo, systemSessionDeps);
    expect(second.id).not.toBe(first.id);
    expect(getActiveSession(repo)?.id).toBe(second.id);

    const openCount = client.sqlite
      .prepare("SELECT COUNT(*) AS n FROM sessions WHERE status = 'open'")
      .get() as { n: number };
    expect(openCount.n).toBe(1);
  });

  it("resumes a suspended session back to open via update", () => {
    const repo = createSqliteSessionRepository(client);
    // Seed a suspended session directly (no UI path creates one yet).
    client.sqlite
      .prepare(
        `INSERT INTO sessions (id, status, created_at, updated_at, opened_at, closed_at)
         VALUES (?, 'suspended', ?, ?, ?, NULL)`,
      )
      .run("seed-1", "2026-06-08T10:00:00.000Z", "2026-06-08T10:00:00.000Z", "2026-06-08T10:00:00.000Z");

    const resumed = resumeSession(repo, systemSessionDeps, "seed-1");

    expect(resumed.id).toBe("seed-1");
    expect(resumed.status).toBe("open");
    expect(resumed.openedAt).toBe("2026-06-08T10:00:00.000Z");
    expect(getActiveSession(repo)?.id).toBe("seed-1");
  });

  it("keeps the active unique index when resuming with another open session", () => {
    const repo = createSqliteSessionRepository(client);
    const open = createSession(repo, systemSessionDeps);
    client.sqlite
      .prepare(
        `INSERT INTO sessions (id, status, created_at, updated_at, opened_at, closed_at)
         VALUES (?, 'suspended', ?, ?, ?, NULL)`,
      )
      .run("seed-2", "2026-06-08T10:00:00.000Z", "2026-06-08T10:00:00.000Z", "2026-06-08T10:00:00.000Z");

    expect(() => resumeSession(repo, systemSessionDeps, "seed-2")).toThrow(
      ActiveSessionExistsError,
    );
    // The original open session is untouched and still unique.
    expect(getActiveSession(repo)?.id).toBe(open.id);
    const openCount = client.sqlite
      .prepare("SELECT COUNT(*) AS n FROM sessions WHERE status = 'open'")
      .get() as { n: number };
    expect(openCount.n).toBe(1);
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
