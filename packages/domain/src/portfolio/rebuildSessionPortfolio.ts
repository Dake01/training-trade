
import type { Portfolio } from "@training-trade/shared";
import type { DecisionSide } from "@training-trade/shared";
import type { SessionDeps } from "../sessions/types";
import { applyDecisionToStore, type ApplyDecisionInput } from "./applyDecisionToPortfolio";
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
  return repo.transaction((store) => {
    const bootstrap = store.findBootstrap(sessionId);
    if (!bootstrap) throw new PortfolioNotFoundError();

    store.deleteDecisionSnapshots(sessionId);

    let portfolio: Portfolio = toPortfolio(bootstrap, [], bootstrap.createdAt);
    for (const entry of effectiveDecisions) {
      const input: ApplyDecisionInput = {
        decisionId: entry.decisionId,
        assetId: entry.assetId,
        side: entry.side,
        quantity: entry.quantity,
        referencePrice: entry.referencePrice,
      };
      portfolio = applyDecisionToStore(store, deps, sessionId, input);
    }

    return portfolio;
  });
}
