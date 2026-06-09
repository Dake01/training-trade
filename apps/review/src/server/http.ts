import {
  apiErrors,
  ERROR_CODES,
  fail,
  type ApiError,
} from "@training-trade/shared";
import { applyCorsHeaders } from "./cors";

/** Serialise a response body as JSON with the given HTTP status. */
export function jsonResponse(
  body: unknown,
  status: number,
  request?: Request,
): Response {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
  return request ? applyCorsHeaders(response, request) : response;
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
export function toApiError(error: unknown): ApiError | null {
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
    case ERROR_CODES.ASSET_NOT_IN_SESSION:
      return apiErrors.assetNotInSession();
    case ERROR_CODES.DECISION_NOT_FOUND:
      return apiErrors.decisionNotFound();
    case ERROR_CODES.DECISION_NOT_AMENDABLE:
      return apiErrors.decisionNotAmendable();
    default:
      return null;
  }
}

/** Build a structured error response, defaulting to a 500 for unknown errors. */
export function errorResponse(error: unknown): Response {
  const apiError = toApiError(error) ?? apiErrors.internal();
  return jsonResponse(fail(apiError), apiError.status);
}
