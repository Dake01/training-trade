import { describe, expect, it } from "vitest";
import { applyDecisionToPortfolio } from "../applyDecisionToPortfolio";
import { getSessionPortfolioPerformance } from "../getSessionPortfolioPerformance";
import { initializePortfolio } from "../initializePortfolio";
import { bootstrapSnapshot, createFakePortfolioRepository, openSession } from "./fakePortfolioRepo";
import { systemSessionDeps } from "../../sessions/deps";

function fixedDeps(ids: string[]) {
  let i = 0;
  return { ...systemSessionDeps, ids: { generate: () => ids[i++] ?? `id-${i}` } };
}

describe("getSessionPortfolioPerformance", () => {
  it("returns null when the portfolio is not initialized", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")], []);
    expect(getSessionPortfolioPerformance(repo, "s-1")).toBeNull();
  });

  it("projects a stable equity curve from ordered snapshots", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")], [bootstrapSnapshot("s-1")]);
    initializePortfolio(repo, systemSessionDeps, "s-1");
    applyDecisionToPortfolio(repo, fixedDeps(["snap-1", "pos-1"]), "s-1", {
      decisionId: "d-1", assetId: "A", side: "buy", quantity: "10", referencePrice: "100",
    });
    applyDecisionToPortfolio(repo, fixedDeps(["snap-2", "pos-2"]), "s-1", {
      decisionId: "d-2", assetId: "A", side: "sell", quantity: "5", referencePrice: "120",
    });

    const performance = getSessionPortfolioPerformance(repo, "s-1");
    expect(performance?.initialCapital).toBe("10000");
    expect(performance?.currentCapital).toBe("10200");
    expect(performance?.points.map((point) => point.index)).toEqual([0, 1, 2]);
    expect(performance?.points.map((point) => point.equity)).toEqual(["10000", "10000", "10200"]);
  });

  it("keeps session curves isolated", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1"), openSession("s-2")],
      [bootstrapSnapshot("s-1"), bootstrapSnapshot("s-2")],
    );
    applyDecisionToPortfolio(repo, fixedDeps(["snap-a", "pos-a"]), "s-1", {
      decisionId: "d-1", assetId: "A", side: "buy", quantity: "1", referencePrice: "100",
    });

    expect(getSessionPortfolioPerformance(repo, "s-1")?.points).toHaveLength(2);
    expect(getSessionPortfolioPerformance(repo, "s-2")?.points).toHaveLength(1);
  });
});
