import { describe, expect, it } from "vitest";
import { applyDecisionToPortfolio } from "../portfolio/applyDecisionToPortfolio";
import { initializePortfolio } from "../portfolio/initializePortfolio";
import { bootstrapSnapshot, createFakePortfolioRepository, openSession as openPortfolioSession } from "../portfolio/__tests__/fakePortfolioRepo";
import { systemSessionDeps } from "../sessions/deps";
import { calculateSessionStats } from "./calculateSessionStats";
import { createFakeAmendmentRepository, decision, openSession } from "../decisions/amendments/__tests__/fakeAmendmentRepo";

function fixedDeps(ids: string[]) {
  let i = 0;
  return { ...systemSessionDeps, ids: { generate: () => ids[i++] ?? `id-${i}` } };
}

describe("calculateSessionStats", () => {
  it("returns null when portfolio performance is unavailable", () => {
    const decisionRepo = createFakeAmendmentRepository({ sessions: [openSession("s-1")] });
    const portfolioRepo = createFakePortfolioRepository([openPortfolioSession("s-1")], []);

    expect(calculateSessionStats(decisionRepo, portfolioRepo, systemSessionDeps, "s-1")).toBeNull();
  });

  it("calculates base stats from effective decisions and equity snapshots", () => {
    const session = openSession("s-1");
    const decisions = [
      decision("d-1", "s-1", "A", { side: "buy", quantity: "10", referencePrice: "100", logicalTimestamp: "2026-06-10T10:00:00.000Z" }),
      decision("d-2", "s-1", "A", { side: "sell", quantity: "5", referencePrice: "120", logicalTimestamp: "2026-06-10T11:00:00.000Z" }),
      decision("d-3", "s-1", "A", { side: "sell", quantity: "5", referencePrice: "90", logicalTimestamp: "2026-06-10T12:00:00.000Z" }),
    ];
    const decisionRepo = createFakeAmendmentRepository({ sessions: [session], decisions });
    const portfolioRepo = createFakePortfolioRepository([openPortfolioSession("s-1")], [bootstrapSnapshot("s-1")]);

    initializePortfolio(portfolioRepo, systemSessionDeps, "s-1");
    applyDecisionToPortfolio(portfolioRepo, fixedDeps(["snap-1", "pos-1"]), "s-1", {
      decisionId: "d-1", assetId: "A", side: "buy", quantity: "10", referencePrice: "100",
    });
    applyDecisionToPortfolio(portfolioRepo, fixedDeps(["snap-2", "pos-2"]), "s-1", {
      decisionId: "d-2", assetId: "A", side: "sell", quantity: "5", referencePrice: "120",
    });
    applyDecisionToPortfolio(portfolioRepo, fixedDeps(["snap-3"]), "s-1", {
      decisionId: "d-3", assetId: "A", side: "sell", quantity: "5", referencePrice: "90",
    });

    const stats = calculateSessionStats(decisionRepo, portfolioRepo, systemSessionDeps, "s-1");

    expect(stats).toMatchObject({
      sessionId: "s-1",
      referenceCurrency: "EUR",
      tradeCount: 2,
      winRate: "50",
      netPnL: "50",
      maxDrawdown: "-150",
      performanceChange: "0.5",
    });
    expect(stats?.averageTradeDurationMinutes).toBe("90");
  });

  it("keeps sessions isolated", () => {
    const decisionRepo = createFakeAmendmentRepository({
      sessions: [openSession("s-1"), openSession("s-2")],
      decisions: [decision("d-1", "s-1", "A", { side: "buy" })],
    });
    const portfolioRepo = createFakePortfolioRepository(
      [openPortfolioSession("s-1"), openPortfolioSession("s-2")],
      [bootstrapSnapshot("s-1"), bootstrapSnapshot("s-2")],
    );

    expect(calculateSessionStats(decisionRepo, portfolioRepo, systemSessionDeps, "s-1")?.sessionId).toBe("s-1");
    expect(calculateSessionStats(decisionRepo, portfolioRepo, systemSessionDeps, "s-2")?.sessionId).toBe("s-2");
  });
});
