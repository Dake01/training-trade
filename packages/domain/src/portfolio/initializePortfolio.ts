import {
  INITIAL_CAPITAL_V1,
  REFERENCE_CURRENCY_V1,
  type Portfolio,
} from "@training-trade/shared";
import { SessionNotActiveError, SessionNotFoundError } from "../sessions/errors";
import type { SessionDeps } from "../sessions/types";
import { toPortfolio } from "./mappers";
import type { PortfolioRepository, PortfolioSnapshotRecord } from "./types";

/**
 * Bootstrap a simulated portfolio for the given session (AC 1, 3).
 *
 * Business rules:
 * - The session must exist and be `open`.
 * - Cash starts equal to INITIAL_CAPITAL_V1, positions are empty.
 * - Idempotent: a second call for the same session reuses the existing bootstrap
 *   without creating a duplicate (safe for retries and refreshes).
 */
export function initializePortfolio(
  repo: PortfolioRepository,
  deps: SessionDeps,
  sessionId: string,
): Portfolio {
  return repo.transaction((store) => {
    const existing = store.findBootstrap(sessionId);
    if (existing) return toPortfolio(existing, [], existing.createdAt);

    const session = store.findSession(sessionId);
    if (!session) throw new SessionNotFoundError();
    if (session.status !== "open") throw new SessionNotActiveError();

    const record: PortfolioSnapshotRecord = {
      id: deps.ids.generate(),
      sessionId,
      kind: "bootstrap",
      cash: INITIAL_CAPITAL_V1,
      referenceCurrency: REFERENCE_CURRENCY_V1,
      totalValue: INITIAL_CAPITAL_V1,
      snapshotIndex: 0,
      createdAt: deps.clock.now().toISOString(),
      decisionId: null,
    };

    store.insertBootstrap(record);
    return toPortfolio(record, [], record.createdAt);
  });
}
