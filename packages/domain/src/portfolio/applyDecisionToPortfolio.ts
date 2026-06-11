
import type { Portfolio } from "@training-trade/shared";
import type { DecisionSide } from "@training-trade/shared";
import { toPortfolio } from "./mappers";
import { add, cmp, div, mul, sub } from "./arithmetic";
import { InsufficientPositionError, PortfolioNotFoundError } from "./errors";
import type {
  PortfolioPositionRecord,
  PortfolioRepository,
  PortfolioSnapshotRecord,
  PortfolioStore,
} from "./types";
import type { SessionDeps } from "../sessions/types";

export interface ApplyDecisionInput {
  decisionId: string;
  assetId: string;
  side: DecisionSide;
  quantity: string;
  referencePrice: string;
}

/**
 * Apply a single buy/sell decision to the current portfolio state (AC 1, 2, 3).
 *
 * Business rules:
 * - The portfolio (bootstrap) must exist for the session.
 * - Idempotent: if a snapshot already exists for this decisionId, return it.
 * - Buy: cash decreases, position quantity and average cost update.
 * - Sell: cash increases, position quantity decreases; never goes negative (long-only).
 * - Total value = cash + sum(position.quantity * position.lastPrice).
 */
export function applyDecisionToPortfolio(
  repo: PortfolioRepository,
  deps: SessionDeps,
  sessionId: string,
  input: ApplyDecisionInput,
): Portfolio {
  return repo.transaction((store) => applyDecisionToStore(store, deps, sessionId, input));
}

/**
 * Apply a decision inside an already-open portfolio transaction.
 *
 * This helper lets the capture flow and the portfolio rebuild flow share the
 * same business logic without opening a nested repository transaction for each
 * replayed decision.
 */
export function applyDecisionToStore(
  store: PortfolioStore,
  deps: SessionDeps,
  sessionId: string,
  input: ApplyDecisionInput,
): Portfolio {
  const bootstrap = store.findBootstrap(sessionId);
  if (!bootstrap) throw new PortfolioNotFoundError();

  // Idempotent: return existing snapshot if this decision was already applied.
  const existing = store.findSnapshotByDecision(sessionId, input.decisionId);
  if (existing) {
    const positions = store.findPositionsBySnapshot(existing.id);
    return toPortfolio(existing, positions, bootstrap.createdAt);
  }

  // Get current state (latest snapshot + positions).
  const latest = store.findLatestSnapshot(sessionId);
  const currentCash = latest?.cash ?? bootstrap.cash;
  const currentPositions = latest ? store.findPositionsBySnapshot(latest.id) : [];
  const currentIndex = latest?.snapshotIndex ?? 0;

  const nowIso = deps.clock.now().toISOString();
  const snapshotId = deps.ids.generate();
  const cost = mul(input.quantity, input.referencePrice);

  // Build new positions array.
  const updatedPositions = applyToPositions(
    currentPositions,
    input.assetId,
    input.side,
    input.quantity,
    input.referencePrice,
    snapshotId,
    deps,
    nowIso,
  );

  // Compute new cash.
  const newCash =
    input.side === "buy"
      ? sub(currentCash, cost)
      : add(currentCash, cost);

  // Total value = cash + sum of market values.
  const marketTotal = updatedPositions.reduce(
    (acc, pos) => add(acc, pos.marketValue),
    "0",
  );
  const newTotalValue = add(newCash, marketTotal);

  const snapshot: PortfolioSnapshotRecord = {
    id: snapshotId,
    sessionId,
    kind: "decision",
    cash: newCash,
    referenceCurrency: bootstrap.referenceCurrency,
    totalValue: newTotalValue,
    snapshotIndex: currentIndex + 1,
    createdAt: nowIso,
    decisionId: input.decisionId,
  };

  store.appendSnapshot(snapshot, updatedPositions);
  return toPortfolio(snapshot, updatedPositions, bootstrap.createdAt);
}

function applyToPositions(
  current: PortfolioPositionRecord[],
  assetId: string,
  side: DecisionSide,
  quantity: string,
  referencePrice: string,
  snapshotId: string,
  deps: SessionDeps,
  nowIso: string,
): PortfolioPositionRecord[] {
  const existing = current.find((p) => p.assetId === assetId);

  // Carry forward all OTHER positions unchanged, re-linked to new snapshot.
  const others = current
    .filter((p) => p.assetId !== assetId)
    .map((p) => ({
      ...p,
      id: deps.ids.generate(),
      snapshotId,
      createdAt: nowIso,
    }));

  if (side === "buy") {
    const newQty = existing ? add(existing.quantity, quantity) : quantity;
    const newAvg = existing
      ? div(
          add(mul(existing.quantity, existing.averagePrice), mul(quantity, referencePrice)),
          newQty,
        )
      : referencePrice;
    const marketValue = mul(newQty, referencePrice);

    const newPos: PortfolioPositionRecord = {
      id: deps.ids.generate(),
      snapshotId,
      assetId,
      quantity: newQty,
      averagePrice: newAvg,
      lastPrice: referencePrice,
      marketValue,
      createdAt: nowIso,
    };
    return [...others, newPos];
  }

  // SELL
  if (!existing || cmp(existing.quantity, quantity) < 0) {
    throw new InsufficientPositionError(assetId);
  }

  const remainingQty = sub(existing.quantity, quantity);

  // If position is fully closed, exclude it from the next snapshot.
  if (cmp(remainingQty, "0") === 0) {
    return others;
  }

  const newPos: PortfolioPositionRecord = {
    id: deps.ids.generate(),
    snapshotId,
    assetId,
    quantity: remainingQty,
    averagePrice: existing.averagePrice,
    lastPrice: referencePrice,
    marketValue: mul(remainingQty, referencePrice),
    createdAt: nowIso,
  };
  return [...others, newPos];
}
