import type { PortfolioHistory } from "@training-trade/shared";
import type { PortfolioRepository } from "./types";

/**
 * Returns the ordered snapshot timeline for a session's portfolio.
 * Returns null when no bootstrap exists (portfolio never initialized).
 * Snapshots are ordered by `snapshotIndex` (ascending).
 */
export function getSessionPortfolioHistory(
  repo: PortfolioRepository,
  sessionId: string,
): PortfolioHistory | null {
  return repo.transaction((store) => {
    const bootstrap = store.findBootstrap(sessionId);
    if (!bootstrap) return null;

    const snapshots = store.findAllSnapshots(sessionId);
    return {
      sessionId,
      referenceCurrency: bootstrap.referenceCurrency,
      snapshots: snapshots.map((s) => ({
        snapshotId: s.id,
        sequence: s.snapshotIndex,
        decisionId: s.decisionId,
        cash: s.cash,
        totalValue: s.totalValue,
        positionsCount: store.findPositionsBySnapshot(s.id).length,
        recordedAt: s.createdAt,
      })),
    };
  });
}
