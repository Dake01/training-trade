import { ERROR_CODES } from "@training-trade/shared";

export class PortfolioNotFoundError extends Error {
  readonly code = ERROR_CODES.SESSION_NOT_FOUND;
  constructor() {
    super("Portefeuille introuvable pour cette session.");
    this.name = "PortfolioNotFoundError";
  }
}

export class InsufficientPositionError extends Error {
  readonly code = "INSUFFICIENT_POSITION";
  constructor(assetId: string) {
    super(`Quantite insuffisante pour vendre l'actif ${assetId}.`);
    this.name = "InsufficientPositionError";
  }
}
