import { ERROR_CODES } from "@training-trade/shared";

/**
 * Thrown when a decision references an asset that is not linked to the target
 * session. The UI must never be the only line of defence, so the rule is
 * enforced in the domain. The API layer maps this to a structured 409
 * `ASSET_NOT_IN_SESSION` error.
 */
export class AssetNotInSessionError extends Error {
  readonly code = ERROR_CODES.ASSET_NOT_IN_SESSION;

  constructor() {
    super("L'actif n'est pas associe a cette session.");
    this.name = "AssetNotInSessionError";
  }
}
