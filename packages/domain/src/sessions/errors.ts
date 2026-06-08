import { ERROR_CODES } from "@training-trade/shared";

/**
 * Thrown by `createSession` when an active (`open`) session already exists.
 * The API layer maps this to a structured 409 `ACTIVE_SESSION_EXISTS` error.
 */
export class ActiveSessionExistsError extends Error {
  readonly code = ERROR_CODES.ACTIVE_SESSION_EXISTS;

  constructor() {
    super("Une session active existe deja.");
    this.name = "ActiveSessionExistsError";
  }
}

/**
 * Thrown when a transition targets a session id that does not exist.
 * The API layer maps this to a structured 404 `SESSION_NOT_FOUND` error.
 */
export class SessionNotFoundError extends Error {
  readonly code = ERROR_CODES.SESSION_NOT_FOUND;

  constructor() {
    super("Session introuvable.");
    this.name = "SessionNotFoundError";
  }
}

/**
 * Thrown when closing a session that is already `closed`, or resuming a
 * `closed` session (explicit reopen is out of scope for this story).
 * The API layer maps this to a structured 409 `SESSION_ALREADY_CLOSED` error.
 */
export class SessionAlreadyClosedError extends Error {
  readonly code = ERROR_CODES.SESSION_ALREADY_CLOSED;

  constructor() {
    super("La session est deja cloturee.");
    this.name = "SessionAlreadyClosedError";
  }
}

/**
 * Thrown when closing a session that is not `open` (e.g. `suspended`).
 * The API layer maps this to a structured 409 `SESSION_NOT_ACTIVE` error.
 */
export class SessionNotActiveError extends Error {
  readonly code = ERROR_CODES.SESSION_NOT_ACTIVE;

  constructor() {
    super("La session n'est pas active.");
    this.name = "SessionNotActiveError";
  }
}
