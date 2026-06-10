import {
  INITIAL_CAPITAL_V1,
  type Portfolio,
  type PortfolioPosition,
} from "@training-trade/shared";
import type { PortfolioPositionRecord, PortfolioSnapshotRecord } from "./types";

/** Map a domain position record to the public portfolio position DTO. */
export function toPortfolioPosition(record: PortfolioPositionRecord): PortfolioPosition {
  return {
    assetId: record.assetId,
    quantity: record.quantity,
    averagePrice: record.averagePrice,
    lastPrice: record.lastPrice,
    marketValue: record.marketValue,
  };
}

/**
 * Map a domain snapshot record and its positions to the public portfolio DTO.
 * `initializedAt` is always the bootstrap snapshot's `createdAt` timestamp.
 */
export function toPortfolio(
  snapshot: PortfolioSnapshotRecord,
  positions: PortfolioPositionRecord[],
  initializedAt: string,
): Portfolio {
  return {
    sessionId: snapshot.sessionId,
    referenceCurrency: snapshot.referenceCurrency,
    initialCapital: INITIAL_CAPITAL_V1,
    cash: snapshot.cash,
    totalValue: snapshot.totalValue,
    positions: positions.map(toPortfolioPosition),
    initializedAt,
    updatedAt: snapshot.createdAt,
  };
}
