import { describe, expect, it } from "vitest";
import { fixedDeps } from "../../sessions/__tests__/fakeRepo";
import { applyDecisionToPortfolio } from "../applyDecisionToPortfolio";
import { InsufficientPositionError, PortfolioNotFoundError } from "../errors";
import {
  bootstrapSnapshot,
  createFakePortfolioRepository,
  openSession,
} from "./fakePortfolioRepo";

const buy = (assetId: string, qty: string, price: string, decisionId = "d-1") => ({
  decisionId,
  assetId,
  side: "buy" as const,
  quantity: qty,
  referencePrice: price,
});

const sell = (assetId: string, qty: string, price: string, decisionId = "d-2") => ({
  decisionId,
  assetId,
  side: "sell" as const,
  quantity: qty,
  referencePrice: price,
});

describe("applyDecisionToPortfolio", () => {
  it("BUY decreases cash and creates a position", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    const portfolio = applyDecisionToPortfolio(
      repo,
      fixedDeps(),
      "s-1",
      buy("asset-A", "10", "100"),
    );

    expect(portfolio.cash).toBe("9000");
    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0]?.assetId).toBe("asset-A");
    expect(portfolio.positions[0]?.quantity).toBe("10");
    expect(portfolio.positions[0]?.averagePrice).toBe("100");
    expect(portfolio.positions[0]?.lastPrice).toBe("100");
    expect(portfolio.positions[0]?.marketValue).toBe("1000");
    expect(portfolio.totalValue).toBe("10000");
  });

  it("BUY adds to existing position with correct average cost", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-1", ...Array(10).fill("x")] }), "s-1", buy("A", "10", "100", "d-1"));
    const portfolio = applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-2", ...Array(10).fill("y")] }), "s-1", buy("A", "10", "200", "d-2"));

    expect(portfolio.positions[0]?.quantity).toBe("20");
    // avg = (10*100 + 10*200) / 20 = 3000/20 = 150
    expect(portfolio.positions[0]?.averagePrice).toBe("150");
    expect(portfolio.cash).toBe("7000"); // 10000 - 1000 - 2000
  });

  it("SELL reduces position and increases cash", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-1", ...Array(10).fill("x")] }), "s-1", buy("A", "10", "100", "d-1"));
    const portfolio = applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-2", ...Array(10).fill("y")] }), "s-1", sell("A", "4", "120", "d-2"));

    expect(portfolio.cash).toBe("9480"); // 9000 + 4*120
    expect(portfolio.positions[0]?.quantity).toBe("6");
    expect(portfolio.positions[0]?.lastPrice).toBe("120");
    expect(portfolio.positions[0]?.marketValue).toBe("720");
    expect(portfolio.totalValue).toBe("10200"); // 9480 + 720
  });

  it("SELL that closes a position removes it from the list", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-1", ...Array(10).fill("x")] }), "s-1", buy("A", "5", "100", "d-1"));
    const portfolio = applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-2", ...Array(10).fill("y")] }), "s-1", sell("A", "5", "110", "d-2"));

    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.cash).toBe("10050"); // 9500 + 550
    expect(portfolio.totalValue).toBe("10050");
  });

  it("multi-asset: BUY two assets keeps them separate", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-1", ...Array(10).fill("a")] }), "s-1", buy("A", "5", "100", "d-1"));
    const portfolio = applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-2", ...Array(10).fill("b")] }), "s-1", buy("B", "3", "200", "d-2"));

    expect(portfolio.positions).toHaveLength(2);
    expect(portfolio.cash).toBe("8900"); // 10000 - 500 - 600
    expect(portfolio.totalValue).toBe("10000"); // 8900 + 500 + 600
  });

  it("SELL throws InsufficientPositionError when quantity exceeds holdings", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-1", ...Array(10).fill("x")] }), "s-1", buy("A", "5", "100", "d-1"));

    expect(() =>
      applyDecisionToPortfolio(repo, fixedDeps(), "s-1", sell("A", "10", "100", "d-2")),
    ).toThrow(InsufficientPositionError);
  });

  it("SELL throws InsufficientPositionError when no position exists", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    expect(() =>
      applyDecisionToPortfolio(repo, fixedDeps(), "s-1", sell("A", "1", "100")),
    ).toThrow(InsufficientPositionError);
  });

  it("throws PortfolioNotFoundError when no portfolio exists for the session", () => {
    const repo = createFakePortfolioRepository([openSession("s-1")]);

    expect(() =>
      applyDecisionToPortfolio(repo, fixedDeps(), "s-1", buy("A", "1", "100")),
    ).toThrow(PortfolioNotFoundError);
  });

  it("is idempotent: applying the same decisionId twice returns the same state", () => {
    const repo = createFakePortfolioRepository(
      [openSession("s-1")],
      [bootstrapSnapshot("s-1")],
    );

    const first = applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-1", ...Array(10).fill("x")] }), "s-1", buy("A", "5", "100", "d-1"));
    const second = applyDecisionToPortfolio(repo, fixedDeps({ ids: ["snap-x", ...Array(10).fill("y")] }), "s-1", buy("A", "5", "100", "d-1"));

    expect(first.cash).toBe(second.cash);
    expect(first.positions[0]?.quantity).toBe(second.positions[0]?.quantity);
  });
});
