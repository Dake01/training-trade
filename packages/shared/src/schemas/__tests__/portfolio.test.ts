import { describe, expect, it } from "vitest";
import {
  INITIAL_CAPITAL_V1,
  portfolioEquityPointSchema,
  portfolioHistorySchema,
  portfolioPerformanceSchema,
  portfolioSchema,
  portfolioStatsSchema,
  portfolioSnapshotSummarySchema,
  REFERENCE_CURRENCY_V1,
  sessionPortfolioHistoryResponseSchema,
  sessionPortfolioPerformanceResponseSchema,
  sessionPortfolioResponseSchema,
  sessionPortfolioStatsResponseSchema,
} from "../portfolio";

const validPortfolio = {
  sessionId: "session-1",
  referenceCurrency: "EUR",
  initialCapital: "10000",
  cash: "10000",
  totalValue: "10000",
  positions: [],
  initializedAt: "2026-06-10T10:00:00.000Z",
  updatedAt: "2026-06-10T10:00:00.000Z",
};

describe("V1 constants", () => {
  it("INITIAL_CAPITAL_V1 is a positive decimal string", () => {
    expect(Number(INITIAL_CAPITAL_V1)).toBeGreaterThan(0);
    expect(/^\d+(\.\d+)?$/.test(INITIAL_CAPITAL_V1)).toBe(true);
  });

  it("REFERENCE_CURRENCY_V1 is a non-empty string", () => {
    expect(REFERENCE_CURRENCY_V1.length).toBeGreaterThan(0);
  });
});

describe("portfolioSchema", () => {
  it("accepts a full bootstrap portfolio DTO", () => {
    expect(portfolioSchema.parse(validPortfolio)).toMatchObject(validPortfolio);
  });

  it("accepts an empty positions array", () => {
    const parsed = portfolioSchema.parse(validPortfolio);
    expect(parsed.positions).toEqual([]);
  });

  it("rejects a non-positive cash value", () => {
    expect(() =>
      portfolioSchema.parse({ ...validPortfolio, cash: "0" }),
    ).toThrow();
  });

  it("rejects a non-ISO initializedAt", () => {
    expect(() =>
      portfolioSchema.parse({ ...validPortfolio, initializedAt: "2026/06/10" }),
    ).toThrow();
  });

  it("rejects a missing sessionId", () => {
    expect(() =>
      portfolioSchema.parse({ ...validPortfolio, sessionId: "" }),
    ).toThrow();
  });
});

describe("sessionPortfolioResponseSchema", () => {
  it("accepts a portfolio response envelope", () => {
    const parsed = sessionPortfolioResponseSchema.parse({
      portfolio: validPortfolio,
    });
    expect(parsed.portfolio.sessionId).toBe("session-1");
  });
});

const validSnapshot = {
  snapshotId: "snap-1",
  sequence: 0,
  decisionId: null,
  cash: "10000",
  totalValue: "10000",
  positionsCount: 0,
  recordedAt: "2026-06-10T10:00:00.000Z",
};

describe("portfolioSnapshotSummarySchema", () => {
  it("accepts a bootstrap snapshot summary", () => {
    expect(portfolioSnapshotSummarySchema.parse(validSnapshot)).toMatchObject(validSnapshot);
  });

  it("accepts a decision snapshot with a decisionId", () => {
    const snap = { ...validSnapshot, snapshotId: "snap-2", sequence: 1, decisionId: "d-1", cash: "9000", positionsCount: 1 };
    expect(portfolioSnapshotSummarySchema.parse(snap)).toMatchObject(snap);
  });

  it("rejects a negative positionsCount", () => {
    expect(() => portfolioSnapshotSummarySchema.parse({ ...validSnapshot, positionsCount: -1 })).toThrow();
  });
});

describe("portfolioHistorySchema", () => {
  it("accepts a history with zero snapshots", () => {
    const h = { sessionId: "s-1", referenceCurrency: "EUR", snapshots: [] };
    expect(portfolioHistorySchema.parse(h)).toMatchObject(h);
  });

  it("accepts a history with two snapshots", () => {
    const snap2 = { ...validSnapshot, snapshotId: "snap-2", sequence: 1, decisionId: "d-1", cash: "9000" };
    const h = { sessionId: "s-1", referenceCurrency: "EUR", snapshots: [validSnapshot, snap2] };
    expect(portfolioHistorySchema.parse(h).snapshots).toHaveLength(2);
  });
});

describe("sessionPortfolioHistoryResponseSchema", () => {
  it("accepts a history response envelope", () => {
    const h = { sessionId: "s-1", referenceCurrency: "EUR", snapshots: [validSnapshot] };
    const parsed = sessionPortfolioHistoryResponseSchema.parse({ history: h });
    expect(parsed.history.sessionId).toBe("s-1");
  });
});


const validEquityPoint = {
  index: 0,
  snapshotId: "snap-1",
  timestamp: "2026-06-10T10:00:00.000Z",
  equity: "10000",
};

describe("portfolioEquityPointSchema", () => {
  it("accepts an ordered equity point", () => {
    expect(portfolioEquityPointSchema.parse(validEquityPoint)).toMatchObject(validEquityPoint);
  });

  it("rejects a negative index", () => {
    expect(() => portfolioEquityPointSchema.parse({ ...validEquityPoint, index: -1 })).toThrow();
  });
});

describe("portfolioPerformanceSchema", () => {
  it("accepts a minimal performance projection", () => {
    const performance = {
      sessionId: "s-1",
      referenceCurrency: "EUR",
      initialCapital: "10000",
      currentCapital: "10050",
      points: [validEquityPoint, { ...validEquityPoint, index: 1, snapshotId: "snap-2", equity: "10050" }],
    };
    expect(portfolioPerformanceSchema.parse(performance).points).toHaveLength(2);
  });
});

describe("sessionPortfolioPerformanceResponseSchema", () => {
  it("accepts a performance response envelope", () => {
    const performance = {
      sessionId: "s-1",
      referenceCurrency: "EUR",
      initialCapital: "10000",
      currentCapital: "10000",
      points: [validEquityPoint],
    };
    const parsed = sessionPortfolioPerformanceResponseSchema.parse({ performance });
    expect(parsed.performance.currentCapital).toBe("10000");
  });
});


const validStats = {
  sessionId: "s-1",
  referenceCurrency: "EUR",
  tradeCount: 2,
  winRate: "50",
  netPnL: "120.5",
  maxDrawdown: "-2.5",
  averageTradeDurationMinutes: "45",
  performanceChange: "1.2",
  calculatedAt: "2026-06-10T10:00:00.000Z",
};

describe("portfolioStatsSchema", () => {
  it("accepts V1 statistics with signed monetary values", () => {
    expect(portfolioStatsSchema.parse(validStats)).toMatchObject(validStats);
  });

  it("accepts null average duration when no trade is closed", () => {
    expect(portfolioStatsSchema.parse({ ...validStats, tradeCount: 0, averageTradeDurationMinutes: null }).averageTradeDurationMinutes).toBeNull();
  });
});

describe("sessionPortfolioStatsResponseSchema", () => {
  it("accepts a stats response envelope", () => {
    const parsed = sessionPortfolioStatsResponseSchema.parse({ stats: validStats });
    expect(parsed.stats.tradeCount).toBe(2);
  });
});
