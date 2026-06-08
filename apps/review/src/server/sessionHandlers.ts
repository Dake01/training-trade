import {
  ActiveSessionExistsError,
  createSession,
  getActiveSession,
  systemSessionDeps,
  type SessionRepository,
} from "@training-trade/domain";
import { apiErrors, fail, ok } from "@training-trade/shared";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isSqliteActiveSessionConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  return (
    code === "SQLITE_CONSTRAINT_UNIQUE" &&
    (error.message.includes("uniq_active_session") ||
      error.message.includes("sessions.status"))
  );
}

function conflictResponse(): Response {
  const apiError = apiErrors.activeSessionExists();
  return jsonResponse(fail(apiError), apiError.status);
}

/**
 * POST /api/sessions — create and immediately open a session (AC 1 & 2).
 * Returns 201 on success, or a structured 409 when an active session exists.
 * Business rules live in the domain; this handler only orchestrates.
 */
export function handleCreateSession(repo: SessionRepository): Response {
  try {
    const session = createSession(repo, systemSessionDeps);
    return jsonResponse(ok({ session }), 201);
  } catch (error) {
    if (error instanceof ActiveSessionExistsError || isSqliteActiveSessionConflict(error)) {
      return conflictResponse();
    }
    const apiError = apiErrors.internal();
    return jsonResponse(fail(apiError), apiError.status);
  }
}

/**
 * GET /api/sessions/active — return the active session context, or
 * `{ session: null }` when none is open (AC 2).
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
