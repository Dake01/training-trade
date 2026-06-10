import { describe, expect, it } from "vitest";
import {
  INITIAL_CAPITAL_V1,
  REFERENCE_CURRENCY_V1,
} from "@training-trade/shared";
import { SessionNotActiveError, SessionNotFoundError } from "../../sessions/errors";
import { fixedDeps } from "../../sessions/__tests__/fakeRepo";
import { initializePortfolio } from "../initializePortfolio";
import {
  bootstrapSnapshot,
  closedSession,
  createFakePortfolioRepository,
  openSession,
} from "./fakePortfolioRepo";

describe("initializePortfolio", () => {
  it("creates a bootstrap portfolio with the V1 initial capital", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")]);
    const portfolio = initializePortfolio(repo, fixedDeps(), "s-1");

    expect(portfolio.sessionId).toBe("s-1");
    expect(portfolio.cash).toBe(INITIAL_CAPITAL_V1);
    expect(portfolio.totalValue).toBe(INITIAL_CAPITAL_V1);
    expect(portfolio.initialCapital).toBe(INITIAL_CAPITAL_V1);
    expect(portfolio.referenceCurrency).toBe(REFERENCE_CURRENCY_V1);
    expect(portfolio.positions).toEqual([]);
  });

  it("stamps an ISO 8601 initializedAt from the clock", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")]);
    const portfolio = initializePortfolio(
      repo,
      fixedDeps({ iso: "2026-06-10T10:00:00.000Z" }),
      "s-1",
    );

    expect(portfolio.initializedAt).toBe("2026-06-10T10:00:00.000Z");
  });

  it("is idempotent: replaying returns the existing bootstrap unchanged", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    const first = initializePortfolio(repo, fixedDeps({ iso: "2026-06-10T12:00:00.000Z" }), "s-1");
    const second = initializePortfolio(repo, fixedDeps({ iso: "2026-06-10T13:00:00.000Z" }), "s-1");

    expect(first.initializedAt).toBe(second.initializedAt);
    expect(first.sessionId).toBe(second.sessionId);
  });

  it("rejects an unknown session with SessionNotFoundError", () => {
    const repo = createFakePortfolioRepository([]);
    expect(() =>
      initializePortfolio(repo, fixedDeps(), "missing"),
    ).toThrow(SessionNotFoundError);
  });

  it("rejects a closed session with SessionNotActiveError", () => {
    const repo = createFakePortfolioRepository([closedSession("s-closed")]);
    expect(() =>
      initializePortfolio(repo, fixedDeps(), "s-closed"),
    ).toThrow(SessionNotActiveError);
  });

  it("generates a unique id via the injected id generator", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")]);
    initializePortfolio(repo, fixedDeps({ ids: ["bootstrap-id"] }), "s-1");

    const record = repo.findBootstrap("s-1");
    expect(record?.id).toBe("bootstrap-id");
  });
});
