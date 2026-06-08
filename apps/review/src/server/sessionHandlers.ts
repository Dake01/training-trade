import {
  closeSession,
  createSession,
  getActiveSession,
  resumeSession,
  systemSessionDeps,
  type SessionRepository,
} from "@training-trade/domain";
import {
  apiErrors,
  ERROR_CODES,
  fail,
  ok,
  type ApiError,
} from "@training-trade/shared";

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

/**
 * Map a thrown domain error (or a SQLite active-session conflict) to a
 * structured API error. Returns `null` for unexpected errors so the caller can
 * fall back to a 500. Keeps every route handler on the same error contract.
 */
function toApiError(error: unknown): ApiError | null {
  if (isSqliteActiveSessionConflict(error)) {
    return apiErrors.activeSessionExists();
  }
  const code =
    error instanceof Error ? (error as { code?: unknown }).code : undefined;
  switch (code) {
    case ERROR_CODES.ACTIVE_SESSION_EXISTS:
      return apiErrors.activeSessionExists();
    case ERROR_CODES.SESSION_NOT_FOUND:
      return apiErrors.sessionNotFound();
    case ERROR_CODES.SESSION_ALREADY_CLOSED:
      return apiErrors.sessionAlreadyClosed();
    case ERROR_CODES.SESSION_NOT_ACTIVE:
      return apiErrors.sessionNotActive();
    default:
      return null;
  }
}

function errorResponse(error: unknown): Response {
  const apiError = toApiError(error) ?? apiErrors.internal();
  return jsonResponse(fail(apiError), apiError.status);
}

/**
 * POST /api/sessions — create and immediately open a session (story 1.1).
 * Returns 201 on success, or a structured 409 when an active session exists.
 * Business rules live in the domain; this handler only orchestrates.
 */
export function handleCreateSession(repo: SessionRepository): Response {
  try {
    const session = createSession(repo, systemSessionDeps);
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
