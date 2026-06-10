import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyDecisionToPortfolio,
  closeSession,
  createSession,
  getSessionPortfolio,
  getSessionPortfolioHistory,
  initializePortfolio,
  rebuildSessionPortfolio,
  systemSessionDeps,
} from "@training-trade/domain";
import { addSessionAsset } from "@training-trade/domain";
import { INITIAL_CAPITAL_V1, REFERENCE_CURRENCY_V1 } from "@training-trade/shared";
import { createDbClient, type DbClient } from "../../client";
import { createSqliteSessionRepository } from "../sessionRepository";
import { createSqliteSessionAssetRepository } from "../sessionAssetRepository";
import { createSqlitePortfolioRepository } from "../portfolioRepository";

describe("createSqlitePortfolioRepository (integration, in-memory SQLite)", () => {
  let client: DbClient;

  beforeEach(() => {
    client = createDbClient(":memory:");
  });

  afterEach(() => {
    client.close();
  });

  function openTestSession(): string {
    return createSession(
      createSqliteSessionRepository(client),
      systemSessionDeps,
    ).id;
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

  it("creates both portfolio tables", () => {
    const tables = client.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toContain("portfolio_snapshots");
    expect(tables).toContain("portfolio_positions");
  });

  it("bootstrap snapshot has snake_case columns with V1 constants", () => {
    const sessionId = openTestSession();
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);

    const row = client.sqlite
      .prepare(
        "SELECT cash, reference_currency, total_value FROM portfolio_snapshots WHERE session_id = ?",
      )
      .get(sessionId) as { cash: string; reference_currency: string; total_value: string };

    expect(row.cash).toBe(INITIAL_CAPITAL_V1);
    expect(row.reference_currency).toBe(REFERENCE_CURRENCY_V1);
    expect(row.total_value).toBe(INITIAL_CAPITAL_V1);
  });

  it("bootstrap is idempotent — only one row created", () => {
    const sessionId = openTestSession();
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);
    initializePortfolio(repo, systemSessionDeps, sessionId);

    const count = (
      client.sqlite
        .prepare(
          "SELECT COUNT(*) as n FROM portfolio_snapshots WHERE session_id = ? AND kind = 'bootstrap'",
        )
        .get(sessionId) as { n: number }
    ).n;
    expect(count).toBe(1);
  });

  it("BUY creates a decision snapshot and a position row", () => {
    const sessionId = openTestSession();
    const assetId = addAsset(sessionId, "AAPL");
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-1",
      assetId,
      side: "buy",
      quantity: "10",
      referencePrice: "100",
    });

    const snapshotCount = (
      client.sqlite
        .prepare(
          "SELECT COUNT(*) as n FROM portfolio_snapshots WHERE session_id = ?",
        )
        .get(sessionId) as { n: number }
    ).n;
    expect(snapshotCount).toBe(2); // bootstrap + decision

    const positionCount = (
      client.sqlite
        .prepare(
          "SELECT COUNT(*) as n FROM portfolio_positions",
        )
        .get() as { n: number }
    ).n;
    expect(positionCount).toBe(1);
  });

  it("persists exact decimal amounts for positions", () => {
    const sessionId = openTestSession();
    const assetId = addAsset(sessionId, "AAPL");
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-1",
      assetId,
      side: "buy",
      quantity: "12",
      referencePrice: "189.25",
    });

    const pos = client.sqlite
      .prepare("SELECT quantity, average_price, last_price, market_value FROM portfolio_positions")
      .get() as { quantity: string; average_price: string; last_price: string; market_value: string };

    expect(pos.quantity).toBe("12");
    expect(pos.average_price).toBe("189.25");
    expect(pos.last_price).toBe("189.25");
    expect(pos.market_value).toBe("2271");
  });

  it("getSessionPortfolio returns positions after BUY", () => {
    const sessionId = openTestSession();
    const assetId = addAsset(sessionId, "AAPL");
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-1",
      assetId,
      side: "buy",
      quantity: "5",
      referencePrice: "200",
    });

    const portfolio = getSessionPortfolio(repo, sessionId);
    expect(portfolio).not.toBeNull();
    expect(portfolio?.positions).toHaveLength(1);
    expect(portfolio?.positions[0]?.assetId).toBe(assetId);
    expect(portfolio?.cash).toBe("9000");
    expect(portfolio?.totalValue).toBe("10000");
  });

  it("applyDecisionToPortfolio is idempotent — no double counting", () => {
    const sessionId = openTestSession();
    const assetId = addAsset(sessionId, "AAPL");
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-1", assetId, side: "buy", quantity: "5", referencePrice: "100",
    });
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-1", assetId, side: "buy", quantity: "5", referencePrice: "100",
    });

    const portfolio = getSessionPortfolio(repo, sessionId);
    expect(portfolio?.positions[0]?.quantity).toBe("5");
    expect(portfolio?.cash).toBe("9500");
  });

  it("rebuildSessionPortfolio drops decision snapshots and replays effective decisions", () => {
    const sessionId = openTestSession();
    const assetId = addAsset(sessionId, "AAPL");
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-1", assetId, side: "buy", quantity: "10", referencePrice: "100",
    });

    // Rebuild as if d-1 was corrected to qty=5.
    rebuildSessionPortfolio(repo, systemSessionDeps, sessionId, [
      { decisionId: "d-1", assetId, side: "buy", quantity: "5", referencePrice: "100" },
    ]);

    const portfolio = getSessionPortfolio(repo, sessionId);
    expect(portfolio?.positions[0]?.quantity).toBe("5");
    expect(portfolio?.cash).toBe("9500");
  });

  it("vertical: session -> init -> buy -> sell -> coherent state, no double count", () => {
    const sessionId = openTestSession();
    const assetId = addAsset(sessionId, "AAPL");
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-1", assetId, side: "buy", quantity: "10", referencePrice: "100",
    });
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-2", assetId, side: "sell", quantity: "5", referencePrice: "120",
    });

    const portfolio = getSessionPortfolio(repo, sessionId);
    expect(portfolio?.positions[0]?.quantity).toBe("5");
    expect(portfolio?.cash).toBe("9600"); // 10000 - 1000 + 600
    expect(portfolio?.totalValue).toBe("10200"); // 9600 + 5*120
    expect(portfolio?.positions).toHaveLength(1);
  });

  it("vertical: init -> buy -> sell -> portfolio history exposes three ordered snapshots", () => {
    const sessionId = openTestSession();
    const assetId = addAsset(sessionId, "AAPL");
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, sessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-1", assetId, side: "buy", quantity: "10", referencePrice: "100",
    });
    applyDecisionToPortfolio(repo, systemSessionDeps, sessionId, {
      decisionId: "d-2", assetId, side: "sell", quantity: "5", referencePrice: "120",
    });

    const history = getSessionPortfolioHistory(repo, sessionId);
    expect(history?.snapshots).toHaveLength(3);
    expect(history?.snapshots.map((snapshot) => snapshot.sequence)).toEqual([0, 1, 2]);
    expect(history?.snapshots.map((snapshot) => snapshot.decisionId)).toEqual([null, "d-1", "d-2"]);
    expect(history?.snapshots.map((snapshot) => snapshot.positionsCount)).toEqual([0, 1, 1]);
    expect(history?.snapshots.map((snapshot) => snapshot.cash)).toEqual(["10000", "9000", "9600"]);
    expect(history?.snapshots.map((snapshot) => snapshot.totalValue)).toEqual(["10000", "10000", "10200"]);
  });

  it("keeps portfolio history isolated between sessions", () => {
    const firstSessionId = openTestSession();
    const firstAssetId = addAsset(firstSessionId, "AAPL");
    const repo = createSqlitePortfolioRepository(client);

    initializePortfolio(repo, systemSessionDeps, firstSessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, firstSessionId, {
      decisionId: "first-d-1", assetId: firstAssetId, side: "buy", quantity: "1", referencePrice: "100",
    });
    closeSession(createSqliteSessionRepository(client), systemSessionDeps, firstSessionId);

    const secondSessionId = openTestSession();
    const secondAssetId = addAsset(secondSessionId, "MSFT");
    initializePortfolio(repo, systemSessionDeps, secondSessionId);
    applyDecisionToPortfolio(repo, systemSessionDeps, secondSessionId, {
      decisionId: "second-d-1", assetId: secondAssetId, side: "buy", quantity: "2", referencePrice: "200",
    });

    const firstHistory = getSessionPortfolioHistory(repo, firstSessionId);
    const secondHistory = getSessionPortfolioHistory(repo, secondSessionId);

    expect(firstHistory?.snapshots.map((snapshot) => snapshot.decisionId)).toEqual([null, "first-d-1"]);
    expect(secondHistory?.snapshots.map((snapshot) => snapshot.decisionId)).toEqual([null, "second-d-1"]);
    expect(firstHistory?.sessionId).toBe(firstSessionId);
    expect(secondHistory?.sessionId).toBe(secondSessionId);
  });
});
