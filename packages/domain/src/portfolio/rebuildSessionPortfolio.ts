import type { Portfolio } from "@training-trade/shared";
import type { DecisionSide } from "@training-trade/shared";
import type { SessionDeps } from "../sessions/types";
import { applyDecisionToPortfolio, type ApplyDecisionInput } from "./applyDecisionToPortfolio";
import { PortfolioNotFoundError } from "./errors";
import { toPortfolio } from "./mappers";
import type { PortfolioRepository } from "./types";

export interface EffectiveDecisionEntry {
  decisionId: string;
  assetId: string;
  side: DecisionSide;
  quantity: string;
  referencePrice: string;
}

/**
 * Rebuild the portfolio from scratch using the effective ordered decision timeline
 * (AC 4). Called after corrections or cancellations so the portfolio always
 * reflects the audited, amendment-aware state.
 *
 * Steps:
 * 1. Verify the bootstrap exists.
 * 2. Delete all decision snapshots (and their positions) for this session.
 * 3. Re-apply each effective decision in order.
 * 4. Return the final portfolio state.
 */
export function rebuildSessionPortfolio(
  repo: PortfolioRepository,
  deps: SessionDeps,
  sessionId: string,
  effectiveDecisions: EffectiveDecisionEntry[],
): Portfolio {
  // Delete decision snapshots atomically first.
  repo.transaction((store) => {
    const bootstrap = store.findBootstrap(sessionId);
    if (!bootstrap) throw new PortfolioNotFoundError();
    store.deleteDecisionSnapshots(sessionId);
  });

  // Re-apply each effective decision sequentially (non-cancelled ones).
  let portfolio: Portfolio | null = null;
  for (const entry of effectiveDecisions) {
    const input: ApplyDecisionInput = {
      decisionId: entry.decisionId,
      assetId: entry.assetId,
      side: entry.side,
      quantity: entry.quantity,
      referencePrice: entry.referencePrice,
    };
    portfolio = applyDecisionToPortfolio(repo, deps, sessionId, input);
  }

  // If no effective decisions, return the bootstrap state.
  if (!portfolio) {
    const result = repo.transaction((store) => {
      const bootstrap = store.findBootstrap(sessionId);
      if (!bootstrap) throw new PortfolioNotFoundError();
      return toPortfolio(bootstrap, [], bootstrap.createdAt);
    });
    return result;
  }

  return portfolio;
}
