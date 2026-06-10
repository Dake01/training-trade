import { describe, expect, it } from "vitest";
import { INITIAL_CAPITAL_V1, REFERENCE_CURRENCY_V1 } from "@training-trade/shared";
import { getSessionPortfolio } from "../getSessionPortfolio";
import {
  bootstrapSnapshot,
  createFakePortfolioRepository,
  openSession,
} from "./fakePortfolioRepo";

describe("getSessionPortfolio", () => {
  it("returns the bootstrap portfolio for a session that has one", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    const portfolio = getSessionPortfolio(repo, "s-1");

    expect(portfolio).not.toBeNull();
    expect(portfolio?.sessionId).toBe("s-1");
    expect(portfolio?.cash).toBe(INITIAL_CAPITAL_V1);
    expect(portfolio?.totalValue).toBe(INITIAL_CAPITAL_V1);
    expect(portfolio?.referenceCurrency).toBe(REFERENCE_CURRENCY_V1);
    expect(portfolio?.positions).toEqual([]);
  });

  it("returns null when no portfolio exists for the session", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")]);
    const portfolio = getSessionPortfolio(repo, "s-1");
    expect(portfolio).toBeNull();
  });

  it("does not invent positions — the bootstrap always returns an empty array", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    const portfolio = getSessionPortfolio(repo, "s-1");
    expect(portfolio?.positions).toEqual([]);
  });
});
