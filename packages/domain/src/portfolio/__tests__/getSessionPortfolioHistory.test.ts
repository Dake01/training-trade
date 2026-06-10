import { describe, expect, it } from "vitest";
import { getSessionPortfolioHistory } from "../getSessionPortfolioHistory";
import { applyDecisionToPortfolio } from "../applyDecisionToPortfolio";
import { initializePortfolio } from "../initializePortfolio";
import { bootstrapSnapshot, createFakePortfolioRepository, openSession } from "./fakePortfolioRepo";
import { systemSessionDeps } from "../../sessions/deps";

function fixedDeps(ids: string[]) {
  let i = 0;
  return { ...systemSessionDeps, ids: { generate: () => ids[i++] ?? `id-${i}` } };
}

describe("getSessionPortfolioHistory", () => {
  it("returns null when no portfolio initialized", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")], []);
    expect(getSessionPortfolioHistory(repo, "s-1")).toBeNull();
  });

  it("returns a single bootstrap snapshot when no decisions applied", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")], [bootstrapSnapshot("s-1")]);
    const history = getSessionPortfolioHistory(repo, "s-1");
    expect(history).not.toBeNull();
    expect(history?.snapshots).toHaveLength(1);
    expect(history?.snapshots[0]?.sequence).toBe(0);
    expect(history?.snapshots[0]?.decisionId).toBeNull();
    expect(history?.snapshots[0]?.positionsCount).toBe(0);
  });

  it("returns snapshots in ascending order after decisions", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")], [bootstrapSnapshot("s-1")]);
    initializePortfolio(repo, systemSessionDeps, "s-1");
    applyDecisionToPortfolio(repo, fixedDeps(["snap-1", "pos-1"]), "s-1", {
      decisionId: "d-1", assetId: "A", side: "buy", quantity: "5", referencePrice: "100",
    });
    applyDecisionToPortfolio(repo, fixedDeps(["snap-2", "pos-2"]), "s-1", {
      decisionId: "d-2", assetId: "A", side: "sell", quantity: "2", referencePrice: "110",
    });

    const history = getSessionPortfolioHistory(repo, "s-1");
    const sequences = history?.snapshots.map((s) => s.sequence);
    expect(sequences).toEqual([0, 1, 2]);
  });

  it("separates histories of two distinct sessions", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1"), openSession("s-2")],
      [bootstrapSnapshot("s-1"), bootstrapSnapshot("s-2")],
    );
    applyDecisionToPortfolio(repo, fixedDeps(["snap-a", "pos-a"]), "s-1", {
      decisionId: "d-1", assetId: "A", side: "buy", quantity: "10", referencePrice: "50",
    });

    const h1 = getSessionPortfolioHistory(repo, "s-1");
    const h2 = getSessionPortfolioHistory(repo, "s-2");

    expect(h1?.sessionId).toBe("s-1");
    expect(h2?.sessionId).toBe("s-2");
    expect(h1?.snapshots).toHaveLength(2);
    expect(h2?.snapshots).toHaveLength(1);
  });

  it("includes positionsCount per snapshot", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")], [bootstrapSnapshot("s-1")]);
    applyDecisionToPortfolio(repo, fixedDeps(["snap-1", "pos-1"]), "s-1", {
      decisionId: "d-1", assetId: "A", side: "buy", quantity: "5", referencePrice: "100",
    });

    const history = getSessionPortfolioHistory(repo, "s-1");
    expect(history?.snapshots[0]?.positionsCount).toBe(0); // bootstrap
    expect(history?.snapshots[1]?.positionsCount).toBe(1); // after buy
  });
});
