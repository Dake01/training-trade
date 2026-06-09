import type { ApiError } from "./api/response";

/** Stable, machine-readable error codes exposed by the public API. */
export const ERROR_CODES = {
  ACTIVE_SESSION_EXISTS: "ACTIVE_SESSION_EXISTS",
  NO_ACTIVE_SESSION: "NO_ACTIVE_SESSION",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_ALREADY_CLOSED: "SESSION_ALREADY_CLOSED",
  SESSION_NOT_ACTIVE: "SESSION_NOT_ACTIVE",
  ASSET_NOT_IN_SESSION: "ASSET_NOT_IN_SESSION",
  DECISION_NOT_FOUND: "DECISION_NOT_FOUND",
  DECISION_NOT_AMENDABLE: "DECISION_NOT_AMENDABLE",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Factories for the structured errors used in story 1.1. */
export const apiErrors = {
  activeSessionExists: (): ApiError => ({
    code: ERROR_CODES.ACTIVE_SESSION_EXISTS,
    message: "Une session active existe deja.",
    status: 409,
  }),
  noActiveSession: (): ApiError => ({
    code: ERROR_CODES.NO_ACTIVE_SESSION,
    message: "Aucune session active.",
    status: 404,
  }),
  sessionNotFound: (): ApiError => ({
    code: ERROR_CODES.SESSION_NOT_FOUND,
    message: "Session introuvable.",
    status: 404,
  }),
  sessionAlreadyClosed: (): ApiError => ({
    code: ERROR_CODES.SESSION_ALREADY_CLOSED,
    message: "La session est deja cloturee.",
    status: 409,
  }),
  sessionNotActive: (): ApiError => ({
    code: ERROR_CODES.SESSION_NOT_ACTIVE,
    message: "La session n'est pas active.",
    status: 409,
  }),
  assetNotInSession: (): ApiError => ({
    code: ERROR_CODES.ASSET_NOT_IN_SESSION,
    message: "L'actif n'est pas associe a cette session.",
    status: 409,
  }),
  decisionNotFound: (): ApiError => ({
    code: ERROR_CODES.DECISION_NOT_FOUND,
    message: "Decision introuvable.",
    status: 404,
  }),
  decisionNotAmendable: (): ApiError => ({
    code: ERROR_CODES.DECISION_NOT_AMENDABLE,
    message: "Cette decision n'est plus modifiable.",
    status: 409,
  }),
  validation: (message = "Requete invalide."): ApiError => ({
    code: ERROR_CODES.VALIDATION_ERROR,
    message,
    status: 400,
  }),
  internal: (message = "Erreur interne."): ApiError => ({
    code: ERROR_CODES.INTERNAL_ERROR,
    message,
    status: 500,
  }),
};
