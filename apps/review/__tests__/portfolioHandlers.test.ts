import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSqliteSessionAssetRepository,
  createDbClient,
  createSqlitePortfolioRepository,
  createSqliteSessionRepository,
  type DbClient,
} from "@training-trade/db";
import { addSessionAsset, applyDecisionToPortfolio, initializePortfolio, systemSessionDeps } from "@training-trade/domain";
import type { PortfolioRepository, SessionRepository } from "@training-trade/domain";
import { INITIAL_CAPITAL_V1, REFERENCE_CURRENCY_V1 } from "@training-trade/shared";
import { closeSession, createSession } from "@training-trade/domain";
import {
  handleGetSessionPortfolio,
  handleGetSessionPortfolioHistory,
  handleGetSessionPortfolioPerformance,
} from "../src/server/portfolioHandlers";

describe("portfolio API handlers (integration over SQLite)", () => {
  let client: DbClient;
  let sessionRepo: SessionRepository;
  let portfolioRepo: PortfolioRepository;

  beforeEach(() => {
    client = createDbClient(":memory:");
    sessionRepo = createSqliteSessionRepository(client);
    portfolioRepo = createSqlitePortfolioRepository(client);
  });

  afterEach(() => {
    client.close();
  });

  function createAndBootstrap(): string {
    const session = createSession(sessionRepo, systemSessionDeps);
    initializePortfolio(portfolioRepo, systemSessionDeps, session.id);
    return session.id;
  }

  function addAsset(sessionId: string, symbol: string): string {
    const { asset } = addSessionAsset(
      createSqliteSessionAssetRepository(client),
      systemSessionDeps,
      sessionId,
      { symbol },
    );
    return asset.id;
  }

  it("GET /api/sessions/[id]/portfolio returns the bootstrap portfolio", async () => {
    const sessionId = createAndBootstrap();
    const response = handleGetSessionPortfolio(portfolioRepo, sessionId);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.data.portfolio.sessionId).toBe(sessionId);
    expect(body.data.portfolio.cash).toBe(INITIAL_CAPITAL_V1);
    expect(body.data.portfolio.referenceCurrency).toBe(REFERENCE_CURRENCY_V1);
    expect(body.data.portfolio.positions).toEqual([]);
  });

  it("GET returns 404 when no portfolio exists for the session", async () => {
    const response = handleGetSessionPortfolio(portfolioRepo, "unknown-session");
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("the portfolio state is derived, not recomputed in the UI", async () => {
    const sessionId = createAndBootstrap();
    const response = handleGetSessionPortfolio(portfolioRepo, sessionId);
    const body = await response.json();

    expect(body.data.portfolio.totalValue).toBe(body.data.portfolio.cash);
    expect(body.data.portfolio.totalValue).toBe(INITIAL_CAPITAL_V1);
  });

  it("GET /api/sessions/[id]/portfolio/history returns 404 when no portfolio exists", async () => {
    const response = handleGetSessionPortfolioHistory(portfolioRepo, "unknown-session");
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("GET /api/sessions/[id]/portfolio/history returns ordered snapshots after init and decisions", async () => {
    const sessionId = createAndBootstrap();
    const assetId = addAsset(sessionId, "AAPL");

    applyDecisionToPortfolio(portfolioRepo, systemSessionDeps, sessionId, {
      decisionId: "d-1",
      assetId,
      side: "buy",
      quantity: "10",
      referencePrice: "100",
    });
    applyDecisionToPortfolio(portfolioRepo, systemSessionDeps, sessionId, {
      decisionId: "d-2",
      assetId,
      side: "sell",
      quantity: "4",
      referencePrice: "125",
    });

    const response = handleGetSessionPortfolioHistory(portfolioRepo, sessionId);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.data.history.sessionId).toBe(sessionId);
    expect(body.data.history.referenceCurrency).toBe(REFERENCE_CURRENCY_V1);
    expect(body.data.history.snapshots.map((s: { sequence: number }) => s.sequence)).toEqual([0, 1, 2]);
    expect(body.data.history.snapshots.map((s: { decisionId: string | null }) => s.decisionId)).toEqual([
      null,
      "d-1",
      "d-2",
    ]);
    expect(body.data.history.snapshots.at(-1)).toMatchObject({
      cash: "9500",
      totalValue: "10250",
      positionsCount: 1,
    });
  });

  it("GET /api/sessions/[id]/portfolio/performance returns 404 when no portfolio exists", async () => {
    const response = handleGetSessionPortfolioPerformance(portfolioRepo, "unknown-session");
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("GET /api/sessions/[id]/portfolio/performance returns current capital and ordered equity points", async () => {
    const sessionId = createAndBootstrap();
    const assetId = addAsset(sessionId, "AAPL");

    applyDecisionToPortfolio(portfolioRepo, systemSessionDeps, sessionId, {
      decisionId: "d-1",
      assetId,
      side: "buy",
      quantity: "10",
      referencePrice: "100",
    });
    applyDecisionToPortfolio(portfolioRepo, systemSessionDeps, sessionId, {
      decisionId: "d-2",
      assetId,
      side: "sell",
      quantity: "5",
      referencePrice: "120",
    });

    const response = handleGetSessionPortfolioPerformance(portfolioRepo, sessionId);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.error).toBeNull();
    expect(body.data.performance).toMatchObject({
      sessionId,
      referenceCurrency: REFERENCE_CURRENCY_V1,
      initialCapital: "10000",
      currentCapital: "10200",
    });
    expect(body.data.performance.points.map((point: { index: number }) => point.index)).toEqual([0, 1, 2]);
    expect(body.data.performance.points.map((point: { equity: string }) => point.equity)).toEqual(["10000", "10000", "10200"]);
  });

  it("GET /api/sessions/[id]/portfolio/history separates two sessions", async () => {
    const firstSessionId = createAndBootstrap();
    const firstAssetId = addAsset(firstSessionId, "AAPL");

    applyDecisionToPortfolio(portfolioRepo, systemSessionDeps, firstSessionId, {
      decisionId: "first-d-1",
      assetId: firstAssetId,
      side: "buy",
      quantity: "3",
      referencePrice: "100",
    });
    closeSession(sessionRepo, systemSessionDeps, firstSessionId);

    const secondSessionId = createAndBootstrap();
    const secondAssetId = addAsset(secondSessionId, "MSFT");
    applyDecisionToPortfolio(portfolioRepo, systemSessionDeps, secondSessionId, {
      decisionId: "second-d-1",
      assetId: secondAssetId,
      side: "buy",
      quantity: "2",
      referencePrice: "200",
    });

    const firstBody = await handleGetSessionPortfolioHistory(portfolioRepo, firstSessionId).json();
    const secondBody = await handleGetSessionPortfolioHistory(portfolioRepo, secondSessionId).json();

    expect(firstBody.data.history.sessionId).toBe(firstSessionId);
    expect(secondBody.data.history.sessionId).toBe(secondSessionId);
    expect(firstBody.data.history.snapshots.map((s: { decisionId: string | null }) => s.decisionId)).toEqual([
      null,
      "first-d-1",
    ]);
    expect(secondBody.data.history.snapshots.map((s: { decisionId: string | null }) => s.decisionId)).toEqual([
      null,
      "second-d-1",
    ]);
  });
});
