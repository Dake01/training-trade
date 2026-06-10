import type { PortfolioPerformance } from "@training-trade/shared";
import { getSessionPortfolioHistory } from "./getSessionPortfolioHistory";
import type { PortfolioRepository } from "./types";

/**
 * Projects the session performance view from ordered portfolio snapshots.
 * The UI receives a deterministic equity series and does not recalculate it.
 */
export function getSessionPortfolioPerformance(
  repo: PortfolioRepository,
  sessionId: string,
): PortfolioPerformance | null {
  const history = getSessionPortfolioHistory(repo, sessionId);
  if (!history) return null;

  const first = history.snapshots[0];
  const last = history.snapshots.at(-1);

  return {
    sessionId: history.sessionId,
    referenceCurrency: history.referenceCurrency,
    initialCapital: first?.totalValue ?? "0",
    currentCapital: last?.totalValue ?? first?.totalValue ?? "0",
    points: history.snapshots.map((snapshot, index) => ({
      index,
      snapshotId: snapshot.snapshotId,
      timestamp: snapshot.recordedAt,
      equity: snapshot.totalValue,
    })),
  };
}
