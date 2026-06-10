import type { Portfolio } from "@training-trade/shared";
import { toPortfolio } from "./mappers";
import type { PortfolioRepository } from "./types";

/**
 * Read the current portfolio state for a session (AC 2).
 * Returns the latest snapshot with its positions, enriched with `initializedAt`
 * from the bootstrap record. Returns `null` when no portfolio exists.
 */
export function getSessionPortfolio(
  repo: PortfolioRepository,
  sessionId: string,
): Portfolio | null {
  return repo.transaction((store) => {
    const bootstrap = store.findBootstrap(sessionId);
    if (!bootstrap) return null;

    const latest = store.findLatestSnapshot(sessionId);
    if (!latest) return null;

    const positions = store.findPositionsBySnapshot(latest.id);
    return toPortfolio(latest, positions, bootstrap.createdAt);
  });
}
