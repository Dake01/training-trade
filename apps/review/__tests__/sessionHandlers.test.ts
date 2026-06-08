import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDbClient,
  createSqliteSessionRepository,
  type DbClient,
} from "@training-trade/db";
import type { SessionRepository } from "@training-trade/domain";
import {
  handleCreateSession,
  handleGetActiveSession,
} from "../src/server/sessionHandlers";

describe("session API handlers (integration over SQLite)", () => {
  let client: DbClient;
  let repo: SessionRepository;

  beforeEach(() => {
    client = createDbClient(":memory:");
    repo = createSqliteSessionRepository(client);
  });

  afterEach(() => {
    client.close();
  });

  it("POST /api/sessions creates and returns an open session", async () => {
    const response = handleCreateSession(repo);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.meta).toEqual({});
    expect(body.data.session.status).toBe("open");
    expect(body.data.session.canReceiveDecisions).toBe(true);
    expect(typeof body.data.session.id).toBe("string");
  });

  it("GET /api/sessions/active returns the created session", async () => {
    const created = await handleCreateSession(repo).json();

    const response = handleGetActiveSession(repo);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.session.id).toBe(created.data.session.id);
    expect(body.data.session.status).toBe("open");
    expect(body.data.session.canReceiveDecisions).toBe(true);
  });

  it("GET /api/sessions/active returns null session when none is active", async () => {
    const response = handleGetActiveSession(repo);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.data.session).toBeNull();
  });

  it("POST /api/sessions returns a structured 409 conflict when one is active", async () => {
    handleCreateSession(repo);

    const response = handleCreateSession(repo);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toEqual({
      code: "ACTIVE_SESSION_EXISTS",
      message: "Une session active existe deja.",
      status: 409,
    });
  });

  it("GET /api/sessions/active returns a structured 500 when storage fails", async () => {
    const failingRepo: SessionRepository = {
      findActive: () => {
        throw new Error("storage unavailable");
      },
      transaction: () => {
        throw new Error("not used");
      },
    };

    const response = handleGetActiveSession(failingRepo);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Erreur interne.",
      status: 500,
    });
    expect(body.meta).toEqual({});
  });

  it("POST /api/sessions maps SQLite active-session conflicts to 409", async () => {
    const sqliteConflict = Object.assign(
      new Error("UNIQUE constraint failed: sessions.status"),
      { code: "SQLITE_CONSTRAINT_UNIQUE" },
    );
    const conflictingRepo: SessionRepository = {
      findActive: () => null,
      transaction: () => {
        throw sqliteConflict;
      },
    };

    const response = handleCreateSession(conflictingRepo);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toEqual({
      code: "ACTIVE_SESSION_EXISTS",
      message: "Une session active existe deja.",
      status: 409,
    });
  });

});
