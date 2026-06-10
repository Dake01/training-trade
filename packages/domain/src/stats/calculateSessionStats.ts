import type { PortfolioStats } from "@training-trade/shared";
import type { Decision } from "@training-trade/shared";
import { listDecisionTimeline } from "../decisions/amendments/listDecisionTimeline";
import type { DecisionAmendmentRepository } from "../decisions/amendments/types";
import { add, cmp, div, mul, sub, toDecimalString, toFloat } from "../portfolio/arithmetic";
import { getSessionPortfolioPerformance } from "../portfolio/getSessionPortfolioPerformance";
import type { PortfolioRepository } from "../portfolio/types";
import type { SessionDeps } from "../sessions/types";

interface PositionState {
  quantity: string;
  averagePrice: string;
  openedAt: string;
}

/**
 * Calculate the V1 statistics for one session.
 * V1 trade definition: each effective sell decision is one realized trade.
 */
export function calculateSessionStats(
  decisionRepo: DecisionAmendmentRepository,
  portfolioRepo: PortfolioRepository,
  deps: SessionDeps,
  sessionId: string,
): PortfolioStats | null {
  const timeline = listDecisionTimeline(decisionRepo, sessionId);
  const performance = getSessionPortfolioPerformance(portfolioRepo, sessionId);
  if (!performance) return null;

  const effectiveDecisions = timeline
    .map((entry) => entry.decision)
    .filter((decision) => decision.revisionStatus !== "cancelled");

  const realized = calculateRealizedTrades(effectiveDecisions);
  const tradeCount = realized.length;
  const wins = realized.filter((trade) => cmp(trade.pnl, "0") > 0).length;
  const winRate = tradeCount === 0 ? "0" : toDecimalString((wins / tradeCount) * 100);
  const averageTradeDurationMinutes = tradeCount === 0
    ? null
    : toDecimalString(realized.reduce((sum, trade) => sum + trade.durationMinutes, 0) / tradeCount);

  const netPnL = sub(performance.currentCapital, performance.initialCapital);
  const performanceChange = cmp(performance.initialCapital, "0") === 0
    ? "0"
    : toDecimalString((toFloat(netPnL) / toFloat(performance.initialCapital)) * 100);

  return {
    sessionId,
    referenceCurrency: performance.referenceCurrency,
    tradeCount,
    winRate,
    netPnL,
    maxDrawdown: calculateMaxDrawdown(performance.points.map((point) => point.equity)),
    averageTradeDurationMinutes,
    performanceChange,
    calculatedAt: deps.clock.now().toISOString(),
  };
}

function calculateRealizedTrades(decisions: Decision[]): Array<{ pnl: string; durationMinutes: number }> {
  const positions = new Map<string, PositionState>();
  const realized: Array<{ pnl: string; durationMinutes: number }> = [];

  for (const decision of decisions) {
    const current = positions.get(decision.assetId);
    if (decision.side === "buy") {
      if (!current) {
        positions.set(decision.assetId, {
          quantity: decision.quantity,
          averagePrice: decision.referencePrice,
          openedAt: decision.logicalTimestamp,
        });
        continue;
      }

      const newQty = add(current.quantity, decision.quantity);
      positions.set(decision.assetId, {
        quantity: newQty,
        averagePrice: div(
          add(mul(current.quantity, current.averagePrice), mul(decision.quantity, decision.referencePrice)),
          newQty,
        ),
        openedAt: current.openedAt,
      });
      continue;
    }

    if (!current) continue;
    const pnl = mul(decision.quantity, sub(decision.referencePrice, current.averagePrice));
    realized.push({
      pnl,
      durationMinutes: Math.max(0, (Date.parse(decision.logicalTimestamp) - Date.parse(current.openedAt)) / 60000),
    });

    const remaining = sub(current.quantity, decision.quantity);
    if (cmp(remaining, "0") <= 0) {
      positions.delete(decision.assetId);
    } else {
      positions.set(decision.assetId, { ...current, quantity: remaining });
    }
  }

  return realized;
}

function calculateMaxDrawdown(equityValues: string[]): string {
  let peak = equityValues[0] ?? "0";
  let maxDrawdown = "0";

  for (const equity of equityValues) {
    if (cmp(equity, peak) > 0) peak = equity;
    const drawdown = sub(equity, peak);
    if (cmp(drawdown, maxDrawdown) < 0) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}
