import { ERROR_CODES } from "@training-trade/shared";

/**
 * Thrown when an amendment targets a decision that does not exist, or that does
 * not belong to the target session. The API layer maps this to a structured 404
 * `DECISION_NOT_FOUND` error.
 */
export class DecisionNotFoundError extends Error {
  readonly code = ERROR_CODES.DECISION_NOT_FOUND;

  constructor() {
    super("Decision introuvable.");
    this.name = "DecisionNotFoundError";
  }
}

/**
 * Thrown when amending a decision that is no longer modifiable under the stable
 * rule — a cancelled decision is terminal and accepts no further events. The API
 * layer maps this to a structured 409 `DECISION_NOT_AMENDABLE` error.
 */
export class DecisionNotAmendableError extends Error {
  readonly code = ERROR_CODES.DECISION_NOT_AMENDABLE;

  constructor() {
    super("Cette decision n'est plus modifiable.");
    this.name = "DecisionNotAmendableError";
  }
}
