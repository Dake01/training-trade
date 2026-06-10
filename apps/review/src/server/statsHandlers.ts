import {
  calculateSessionStats,
  systemSessionDeps,
  type DecisionAmendmentRepository,
  type PortfolioRepository,
} from "@training-trade/domain";
import { apiErrors, fail, ok } from "@training-trade/shared";
import { errorResponse, jsonResponse } from "./http";

export function handleGetSessionStats(
  decisionRepo: DecisionAmendmentRepository,
  portfolioRepo: PortfolioRepository,
  sessionId: string,
): Response {
  try {
    const stats = calculateSessionStats(decisionRepo, portfolioRepo, systemSessionDeps, sessionId);
    if (!stats) {
      const apiError = apiErrors.sessionNotFound();
      return jsonResponse(fail(apiError), apiError.status);
    }
    return jsonResponse(ok({ stats }), 200);
  } catch (error) {
    return errorResponse(error);
  }
}
