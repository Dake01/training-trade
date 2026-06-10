import {
  getSessionPortfolio,
  getSessionPortfolioHistory,
  getSessionPortfolioPerformance,
  type PortfolioRepository,
} from "@training-trade/domain";
import { apiErrors, fail, ok } from "@training-trade/shared";
import { jsonResponse } from "./http";

/**
 * GET /api/sessions/[id]/portfolio — return the current portfolio state.
 * Returns 200 with the portfolio DTO, or a structured 404 when no portfolio
 * has been bootstrapped for the session.
 */
export function handleGetSessionPortfolio(
  repo: PortfolioRepository,
  sessionId: string,
): Response {
  try {
    const portfolio = getSessionPortfolio(repo, sessionId);
    if (!portfolio) {
      const apiError = apiErrors.sessionNotFound();
      return jsonResponse(fail(apiError), apiError.status);
    }
    return jsonResponse(ok({ portfolio }), 200);
  } catch {
    const apiError = apiErrors.internal();
    return jsonResponse(fail(apiError), apiError.status);
  }
}

/**
 * GET /api/sessions/[id]/portfolio/history — return the ordered snapshot
 * timeline for a session's portfolio (story 2.3).
 * Returns 200 with the history DTO, or 404 when no portfolio exists.
 */
export function handleGetSessionPortfolioHistory(
  repo: PortfolioRepository,
  sessionId: string,
): Response {
  try {
    const history = getSessionPortfolioHistory(repo, sessionId);
    if (!history) {
      const apiError = apiErrors.sessionNotFound();
      return jsonResponse(fail(apiError), apiError.status);
    }
    return jsonResponse(ok({ history }), 200);
  } catch {
    const apiError = apiErrors.internal();
    return jsonResponse(fail(apiError), apiError.status);
  }
}

/**
 * GET /api/sessions/[id]/portfolio/performance — return current capital and
 * ordered equity points projected from persisted portfolio snapshots.
 */
export function handleGetSessionPortfolioPerformance(
  repo: PortfolioRepository,
  sessionId: string,
): Response {
  try {
    const performance = getSessionPortfolioPerformance(repo, sessionId);
    if (!performance) {
      const apiError = apiErrors.sessionNotFound();
      return jsonResponse(fail(apiError), apiError.status);
    }
    return jsonResponse(ok({ performance }), 200);
  } catch {
    const apiError = apiErrors.internal();
    return jsonResponse(fail(apiError), apiError.status);
  }
}
