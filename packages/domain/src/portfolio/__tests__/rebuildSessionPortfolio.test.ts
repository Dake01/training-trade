import { describe, expect, it } from "vitest";
import { fixedDeps } from "../../sessions/__tests__/fakeRepo";
import { applyDecisionToPortfolio } from "../applyDecisionToPortfolio";
import { rebuildSessionPortfolio } from "../rebuildSessionPortfolio";
import {
  bootstrapSnapshot,
  createFakePortfolioRepository,
  openSession,
} from "./fakePortfolioRepo";

describe("rebuildSessionPortfolio", () => {
  it("with no effective decisions returns the bootstrap state (cash only)", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    // Apply a decision then rebuild with an empty timeline (simulates cancellation).
    applyDecisionToPortfolio(
      repo,
      fixedDeps({ ids: ["snap-1", ...Array(10).fill("x")] }),
      "s-1",
      { decisionId: "d-1", assetId: "A", side: "buy", quantity: "5", referencePrice: "100" },
    );

    const portfolio = rebuildSessionPortfolio(repo, fixedDeps(), "s-1", []);

    expect(portfolio.cash).toBe("10000");
    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.totalValue).toBe("10000");
  });

  it("replays effective decisions and removes cancelled ones", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    // Apply two decisions.
    applyDecisionToPortfolio(
      repo,
      fixedDeps({ ids: ["snap-1", ...Array(10).fill("a")] }),
      "s-1",
      { decisionId: "d-1", assetId: "A", side: "buy", quantity: "5", referencePrice: "100" },
    );
    applyDecisionToPortfolio(
      repo,
      fixedDeps({ ids: ["snap-2", ...Array(10).fill("b")] }),
      "s-1",
      { decisionId: "d-2", assetId: "A", side: "buy", quantity: "3", referencePrice: "200" },
    );

    // Rebuild with only d-1 effective (d-2 was cancelled).
    const portfolio = rebuildSessionPortfolio(repo, fixedDeps(), "s-1", [
      { decisionId: "d-1", assetId: "A", side: "buy", quantity: "5", referencePrice: "100" },
    ]);

    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0]?.quantity).toBe("5");
    expect(portfolio.cash).toBe("9500");
  });

  it("replays a corrected decision with its new values", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    // Apply original decision.
    applyDecisionToPortfolio(
      repo,
      fixedDeps({ ids: ["snap-1", ...Array(10).fill("x")] }),
      "s-1",
      { decisionId: "d-1", assetId: "A", side: "buy", quantity: "10", referencePrice: "100" },
    );

    // Rebuild with corrected values (quantity corrected from 10 to 5).
    const portfolio = rebuildSessionPortfolio(repo, fixedDeps(), "s-1", [
      { decisionId: "d-1", assetId: "A", side: "buy", quantity: "5", referencePrice: "100" },
    ]);

    expect(portfolio.positions[0]?.quantity).toBe("5");
    expect(portfolio.cash).toBe("9500");
  });
});
