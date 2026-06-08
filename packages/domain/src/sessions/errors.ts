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
