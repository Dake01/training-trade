import { z } from "zod";
import { isoDateTime, positiveAmountSchema } from "./decision";

/** Fixed V1 starting capital — centralized here as the single source of truth. */
export const INITIAL_CAPITAL_V1 = "10000";

/** Fixed V1 reference currency — unique and stable across all sessions. */
export const REFERENCE_CURRENCY_V1 = "EUR";

/**
 * One open position in the portfolio: a single asset held.
 * `averagePrice` is the weighted-average cost basis.
 * `lastPrice` is the last referencePrice seen for this asset.
 * `marketValue = quantity * lastPrice`.
 * All values are exact decimal strings.
 */
export const portfolioPositionSchema = z.object({
  assetId: z.string().min(1),
  quantity: positiveAmountSchema,
  averagePrice: positiveAmountSchema,
  lastPrice: positiveAmountSchema,
  marketValue: positiveAmountSchema,
});

export type PortfolioPosition = z.infer<typeof portfolioPositionSchema>;

/**
 * Portfolio DTO returned by `GET /api/sessions/[id]/portfolio`.
 * `positions` is empty at bootstrap and grows as decisions are applied.
 * All amounts are exact decimal strings, consistent with decisions.
 * `updatedAt` reflects the latest snapshot; equals `initializedAt` at bootstrap.
 */
export const portfolioSchema = z.object({
  sessionId: z.string().min(1),
  referenceCurrency: z.string().min(1),
  initialCapital: positiveAmountSchema,
  cash: positiveAmountSchema,
  totalValue: positiveAmountSchema,
  positions: z.array(portfolioPositionSchema),
  initializedAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Portfolio = z.infer<typeof portfolioSchema>;

/** Success payload for `GET /api/sessions/[id]/portfolio`. */
export const sessionPortfolioResponseSchema = z.object({
  portfolio: portfolioSchema,
});

/**
 * One entry in the portfolio history timeline.
 * `sequence` mirrors the `snapshot_index` stored in DB (0 = bootstrap).
 * `decisionId` is null for the bootstrap snapshot.
 */
export const portfolioSnapshotSummarySchema = z.object({
  snapshotId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  decisionId: z.string().min(1).nullable(),
  cash: positiveAmountSchema,
  totalValue: positiveAmountSchema,
  positionsCount: z.number().int().nonnegative(),
  recordedAt: isoDateTime,
});
export type PortfolioSnapshotSummary = z.infer<typeof portfolioSnapshotSummarySchema>;

/** Full portfolio history for one session. */
export const portfolioHistorySchema = z.object({
  sessionId: z.string().min(1),
  referenceCurrency: z.string().min(1),
  snapshots: z.array(portfolioSnapshotSummarySchema),
});
export type PortfolioHistory = z.infer<typeof portfolioHistorySchema>;

/** Success payload for `GET /api/sessions/[id]/portfolio/history`. */
export const sessionPortfolioHistoryResponseSchema = z.object({ history: portfolioHistorySchema });


/** One point of the equity curve projected from a portfolio snapshot. */
export const portfolioEquityPointSchema = z.object({
  index: z.number().int().nonnegative(),
  snapshotId: z.string().min(1),
  timestamp: isoDateTime,
  equity: positiveAmountSchema,
});
export type PortfolioEquityPoint = z.infer<typeof portfolioEquityPointSchema>;

/** Performance DTO returned by `GET /api/sessions/[id]/portfolio/performance`. */
export const portfolioPerformanceSchema = z.object({
  sessionId: z.string().min(1),
  referenceCurrency: z.string().min(1),
  initialCapital: positiveAmountSchema,
  currentCapital: positiveAmountSchema,
  points: z.array(portfolioEquityPointSchema),
});
export type PortfolioPerformance = z.infer<typeof portfolioPerformanceSchema>;

/** Success payload for `GET /api/sessions/[id]/portfolio/performance`. */
export const sessionPortfolioPerformanceResponseSchema = z.object({
  performance: portfolioPerformanceSchema,
});


const signedDecimalSchema = z.string().regex(/^-?\d+(\.\d+)?$/, "Expected a decimal string");
const nonNegativeDecimalSchema = z.string().regex(/^\d+(\.\d+)?$/, "Expected a non-negative decimal string");

/** V1 session statistics derived from effective decisions and equity snapshots. */
export const portfolioStatsSchema = z.object({
  sessionId: z.string().min(1),
  referenceCurrency: z.string().min(1),
  tradeCount: z.number().int().nonnegative(),
  winRate: nonNegativeDecimalSchema,
  netPnL: signedDecimalSchema,
  maxDrawdown: signedDecimalSchema,
  averageTradeDurationMinutes: nonNegativeDecimalSchema.nullable(),
  performanceChange: signedDecimalSchema,
  calculatedAt: isoDateTime,
});
export type PortfolioStats = z.infer<typeof portfolioStatsSchema>;

/** Success payload for `GET /api/sessions/[id]/stats`. */
export const sessionPortfolioStatsResponseSchema = z.object({ stats: portfolioStatsSchema });
