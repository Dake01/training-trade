import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDbClient,
  createSqlitePortfolioRepository,
  createSqliteSessionRepository,
  type DbClient,
} from "@training-trade/db";
import type { PortfolioRepository, SessionRepository } from "@training-trade/domain";
import {
  handleCloseSession,
  handleCreateSession,
  handleGetActiveSession,
  handleResumeSession,
} from "../src/server/sessionHandlers";

describe("session API handlers (integration over SQLite)", () => {
  let client: DbClient;
  let repo: SessionRepository;
  let portfolioRepo: PortfolioRepository;

  beforeEach(() => {
    client = createDbClient(":memory:");
    repo = createSqliteSessionRepository(client);
    portfolioRepo = createSqlitePortfolioRepository(client);
  });

  afterEach(() => {
    client.close();
  });

  it("POST /api/sessions creates and returns an open session", async () => {
    const response = handleCreateSession(repo, portfolioRepo);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.meta).toEqual({});
    expect(body.data.session.status).toBe("open");
    expect(body.data.session.canReceiveDecisions).toBe(true);
    expect(typeof body.data.session.id).toBe("string");
  });

  it("POST /api/sessions also bootstraps the portfolio", async () => {
    const response = handleCreateSession(repo, portfolioRepo);
    const body = await response.json();
    const sessionId = body.data.session.id as string;

    const snapshot = client.sqlite
      .prepare(
        "SELECT * FROM portfolio_snapshots WHERE session_id = ? AND kind = 'bootstrap'",
      )
      .get(sessionId);
    expect(snapshot).not.toBeNull();
  });

  it("GET /api/sessions/active returns the created session", async () => {
    const created = await handleCreateSession(repo, portfolioRepo).json();

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
    handleCreateSession(repo, portfolioRepo);

    const response = handleCreateSession(repo, portfolioRepo);
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

  it("POST /api/sessions/[id]/close closes the active session", async () => {
    const created = await handleCreateSession(repo, portfolioRepo).json();
    const id = created.data.session.id as string;

    const response = handleCloseSession(repo, id);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.meta).toEqual({});
    expect(body.data.session.status).toBe("closed");
    expect(body.data.session.canReceiveDecisions).toBe(false);
    expect(body.data.session.closedAt).not.toBeNull();

    // The session is no longer active afterwards.
    const active = await handleGetActiveSession(repo).json();
    expect(active.data.session).toBeNull();
  });

  it("POST /api/sessions/[id]/resume returns an open session (idempotent on open)", async () => {
    const created = await handleCreateSession(repo, portfolioRepo).json();
    const id = created.data.session.id as string;

    const response = handleResumeSession(repo, id);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.data.session.id).toBe(id);
    expect(body.data.session.status).toBe("open");
    expect(body.data.session.canReceiveDecisions).toBe(true);
  });

  it("returns a structured 404 when resuming an unknown session", async () => {
    const response = handleResumeSession(repo, "missing");
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toEqual({
      code: "SESSION_NOT_FOUND",
      message: "Session introuvable.",
      status: 404,
    });
  });

  it("returns a structured 404 when closing an unknown session", async () => {
    const response = handleCloseSession(repo, "missing");
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("returns a structured 409 when closing an already-closed session", async () => {
    const created = await handleCreateSession(repo, portfolioRepo).json();
    const id = created.data.session.id as string;
    handleCloseSession(repo, id);

    const response = handleCloseSession(repo, id);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error).toEqual({
      code: "SESSION_ALREADY_CLOSED",
      message: "La session est deja cloturee.",
      status: 409,
    });
  });

  it("returns a structured 409 when resuming a closed session", async () => {
    const created = await handleCreateSession(repo, portfolioRepo).json();
    const id = created.data.session.id as string;
    handleCloseSession(repo, id);

    const response = handleResumeSession(repo, id);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe("SESSION_ALREADY_CLOSED");
  });

  it("returns a structured 500 when storage fails during a transition", async () => {
    const failingRepo: SessionRepository = {
      findActive: () => null,
      findById: () => {
        throw new Error("storage unavailable");
      },
      transaction: (fn) =>
        fn({
          findActive: () => null,
          findById: () => {
            throw new Error("storage unavailable");
          },
          insert: () => {},
          update: () => {},
        }),
    };

    const response = handleCloseSession(failingRepo, "any");
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Erreur interne.",
      status: 500,
    });
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
    const noopPortfolioRepo: PortfolioRepository = {
      findBootstrap: () => null,
      transaction: (fn) =>
        fn({
          findSession: () => null,
          findBootstrap: () => null,
          insertBootstrap: () => {},
        }),
    };

    const response = handleCreateSession(conflictingRepo, noopPortfolioRepo);
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
