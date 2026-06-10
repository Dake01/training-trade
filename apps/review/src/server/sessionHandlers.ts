import {
  closeSession,
  createSession,
  getActiveSession,
  initializePortfolio,
  resumeSession,
  systemSessionDeps,
  type PortfolioRepository,
  type SessionRepository,
} from "@training-trade/domain";
import { apiErrors, fail, ok } from "@training-trade/shared";
import { errorResponse, jsonResponse } from "./http";

/**
 * POST /api/sessions — create and immediately open a session (story 1.1).
 * Returns 201 on success, or a structured 409 when an active session exists.
 * The portfolio bootstrap is triggered deterministically after session creation
 * so a session is never durably visible without an initial portfolio.
 */
export function handleCreateSession(
  repo: SessionRepository,
  portfolioRepo: PortfolioRepository,
): Response {
  try {
    const session = createSession(repo, systemSessionDeps);
    initializePortfolio(portfolioRepo, systemSessionDeps, session.id);
    return jsonResponse(ok({ session }), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * GET /api/sessions/active — return the active session context, or
 * `{ session: null }` when none is open (story 1.1).
 */
export function handleGetActiveSession(repo: SessionRepository): Response {
  try {
    const session = getActiveSession(repo);
    return jsonResponse(ok({ session }), 200);
  } catch {
    const apiError = apiErrors.internal();
    return jsonResponse(fail(apiError), apiError.status);
  }
}

/**
 * POST /api/sessions/[id]/resume — resume an open/suspended session (AC 1).
 * Returns 200 with the session DTO, 404 when unknown, or 409 for a forbidden
 * transition (closed session) or active-session conflict.
 */
export function handleResumeSession(
  repo: SessionRepository,
  id: string,
): Response {
  try {
    const session = resumeSession(repo, systemSessionDeps, id);
    return jsonResponse(ok({ session }), 200);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/sessions/[id]/close — close an active session (AC 2).
 * Returns 200 with the closed session DTO, 404 when unknown, or 409 when the
 * session is already closed or not active.
 */
export function handleCloseSession(
  repo: SessionRepository,
  id: string,
): Response {
  try {
    const session = closeSession(repo, systemSessionDeps, id);
    return jsonResponse(ok({ session }), 200);
  } catch (error) {
    return errorResponse(error);
  }
}
