import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDbClient,
  createSqliteDecisionAmendmentRepository,
  createSqliteDecisionRepository,
  createSqlitePortfolioRepository,
  createSqliteSessionAssetRepository,
  createSqliteSessionRepository,
  type DbClient,
} from "@training-trade/db";
import { addSessionAsset, closeSession, createSession, initializePortfolio, systemSessionDeps } from "@training-trade/domain";
import { handleCaptureDecision } from "../src/server/decisionHandlers";
import { handleGetSessionStats } from "../src/server/statsHandlers";

function postDecision(body: unknown): Request {
  return new Request("http://localhost/api/sessions/x/decisions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("stats API handlers (integration over SQLite)", () => {
  let client: DbClient;

  beforeEach(() => {
    client = createDbClient(":memory:");
  });

  afterEach(() => {
    client.close();
  });

  function bootstrapSession(symbol = "AAPL") {
    const sessionRepo = createSqliteSessionRepository(client);
    const session = createSession(sessionRepo, systemSessionDeps);
    const { asset } = addSessionAsset(
      createSqliteSessionAssetRepository(client),
      systemSessionDeps,
      session.id,
      { symbol },
    );
    const portfolioRepo = createSqlitePortfolioRepository(client);
    initializePortfolio(portfolioRepo, systemSessionDeps, session.id);
    return { sessionRepo, sessionId: session.id, assetId: asset.id, portfolioRepo };
  }

  async function capture(sessionId: string, assetId: string, side: "buy" | "sell", quantity: string, referencePrice: string, logicalTimestamp: string) {
    const response = await handleCaptureDecision(
      createSqliteDecisionRepository(client),
      createSqlitePortfolioRepository(client),
      sessionId,
      postDecision({ assetId, side, quantity, referencePrice, logicalTimestamp }),
    );
    expect(response.status).toBe(201);
  }

  it("GET /api/sessions/[id]/stats returns 404 when no portfolio exists", async () => {
    const response = handleGetSessionStats(
      createSqliteDecisionAmendmentRepository(client),
      createSqlitePortfolioRepository(client),
      "unknown-session",
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("GET /api/sessions/[id]/stats calculates the vertical session metrics", async () => {
    const { sessionId, assetId } = bootstrapSession();
    await capture(sessionId, assetId, "buy", "10", "100", "2026-06-10T10:00:00.000Z");
    await capture(sessionId, assetId, "sell", "5", "120", "2026-06-10T11:00:00.000Z");
    await capture(sessionId, assetId, "sell", "5", "90", "2026-06-10T12:00:00.000Z");

    const response = handleGetSessionStats(
      createSqliteDecisionAmendmentRepository(client),
      createSqlitePortfolioRepository(client),
      sessionId,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.stats).toMatchObject({
      sessionId,
      tradeCount: 2,
      winRate: "50",
      netPnL: "50",
      maxDrawdown: "-150",
      averageTradeDurationMinutes: "90",
      performanceChange: "0.5",
    });
  });

  it("GET /api/sessions/[id]/stats keeps sessions isolated", async () => {
    const first = bootstrapSession("AAPL");
    await capture(first.sessionId, first.assetId, "buy", "1", "100", "2026-06-10T10:00:00.000Z");
    closeSession(first.sessionRepo, systemSessionDeps, first.sessionId);

    const second = bootstrapSession("MSFT");

    const firstBody = await handleGetSessionStats(
      createSqliteDecisionAmendmentRepository(client),
      createSqlitePortfolioRepository(client),
      first.sessionId,
    ).json();
    const secondBody = await handleGetSessionStats(
      createSqliteDecisionAmendmentRepository(client),
      createSqlitePortfolioRepository(client),
      second.sessionId,
    ).json();

    expect(firstBody.data.stats.sessionId).toBe(first.sessionId);
    expect(secondBody.data.stats.sessionId).toBe(second.sessionId);
    expect(firstBody.data.stats.tradeCount).toBe(0);
    expect(secondBody.data.stats.tradeCount).toBe(0);
  });
});
